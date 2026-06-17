// ─────────────────────────────────────────────
// EditProfileModal — edit your kind-0 profile (NIP-01)
// ─────────────────────────────────────────────
// Banner and avatar are edited visually: click the camera to upload an image
// (it's downscaled in the browser and embedded as a data URI), or paste a
// hosted image URL. Saving publishes a fresh kind-0 event to all relays.
import { useRef, useState } from "react";

import Icon from "./ui/Icon";
import { useNostr, useProfile } from "../context/NostrContext";
import { buildProfile } from "../nostr/events";
import { avatarColor, avatarInitials } from "../nostr/format";

// Read a picked file, downscale it on a canvas, return a JPEG data URI.
// Keeping images small matters: the whole profile is one Nostr event, and
// public relays reject events that are too large.
function fileToDataUrl(file, maxDim, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = URL.createObjectURL(file);
  });
}

// Public relays commonly cap events around 64KB; warn well before that.
const SIZE_WARN_CHARS = 60_000;

export default function EditProfileModal({ onClose }) {
  const { identity, relay } = useNostr();
  const profile = useProfile(identity.pubHex) || {};
  const [form, setForm] = useState({
    name: profile.name || "",
    about: profile.about || "",
    picture: profile.picture || "",
    banner: profile.banner || "",
    nip05: profile.nip05 || "",
    lud16: profile.lud16 || "",
  });
  const [warning, setWarning] = useState("");
  const avatarInput = useRef(null);
  const bannerInput = useRef(null);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const pickImage = (key, maxDim) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file, maxDim);
      setForm((f) => ({ ...f, [key]: dataUrl }));
      setWarning(
        dataUrl.length > SIZE_WARN_CHARS
          ? "That image is large — public relays may reject it. A hosted image URL is safer."
          : "",
      );
    } catch (err) {
      setWarning(err.message);
    }
    e.target.value = ""; // allow re-picking the same file
  };

  const save = () => {
    relay.publish(buildProfile(identity.privHex, form));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-16 px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-gutter py-3 border-b border-outline-variant">
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
          <span className="font-bold">Edit profile</span>
          <button onClick={save} className="bg-on-surface text-surface px-4 py-1.5 rounded-full font-bold text-label-sm">
            Save
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto custom-scrollbar">
          {/* Banner preview + upload */}
          <div className="relative">
            <div
              className="h-36 w-full bg-surface-container-high"
              style={
                form.banner
                  ? { backgroundImage: `url(${form.banner})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: `linear-gradient(135deg, ${avatarColor(identity.pubHex)}33, #131313)` }
              }
            />
            <div className="absolute inset-0 flex items-center justify-center gap-3">
              <IconButton title="Upload banner" icon="add_a_photo" onClick={() => bannerInput.current?.click()} />
              {form.banner && (
                <IconButton title="Remove banner" icon="delete" onClick={() => setForm((f) => ({ ...f, banner: "" }))} />
              )}
            </div>
            <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={pickImage("banner", 1200)} />

            {/* Avatar preview + upload (overlapping the banner, like the profile) */}
            <div className="absolute -bottom-10 left-gutter">
              <div className="relative rounded-full border-4 border-surface-container-low">
                {form.picture ? (
                  <img src={form.picture} alt="avatar preview" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-on-primary"
                    style={{ backgroundColor: avatarColor(identity.pubHex) }}
                  >
                    {avatarInitials(identity.pubHex)}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <IconButton small title="Upload avatar" icon="add_a_photo" onClick={() => avatarInput.current?.click()} />
                </div>
              </div>
            </div>
            <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={pickImage("picture", 256)} />
          </div>

          {/* Fields */}
          <div className="p-gutter pt-14 flex flex-col gap-3">
            {warning && (
              <p className="text-zap-yellow text-label-sm flex items-start gap-1">
                <Icon name="warning" size={14} className="mt-0.5" /> {warning}
              </p>
            )}

            <Field label="Avatar URL (or upload above)">
              <input value={form.picture} onChange={set("picture")} placeholder="https://…/me.png" className={inputClass} />
            </Field>
            <Field label="Banner URL (or upload above)">
              <input value={form.banner} onChange={set("banner")} placeholder="https://…/banner.png" className={inputClass} />
            </Field>
            <Field label="Display name">
              <input value={form.name} onChange={set("name")} className={inputClass} />
            </Field>
            <Field label="Bio">
              <textarea value={form.about} onChange={set("about")} rows={3} className={`${inputClass} resize-none`} />
            </Field>
            <Field label="NIP-05 (name@domain)">
              <input value={form.nip05} onChange={set("nip05")} className={inputClass} />
            </Field>
            <Field label="Lightning address (lud16)">
              <input value={form.lud16} onChange={set("lud16")} className={inputClass} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:border-primary w-full";

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-on-surface-variant text-label-sm">{label}</span>
      {children}
    </label>
  );
}

function IconButton({ icon, title, onClick, small = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`${small ? "w-8 h-8" : "w-11 h-11"} rounded-full flex items-center justify-center text-on-surface transition-colors`}
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <Icon name={icon} size={small ? 16 : 20} />
    </button>
  );
}
