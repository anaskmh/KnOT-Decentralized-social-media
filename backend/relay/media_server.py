"""
media-s3-knot – a tiny file upload server backed by a real AWS S3 bucket
--------------------------------------------------------------------------
This is the "our own server" option (next to Blossom, the default) that
KnOT's frontend can upload images/media to. It does ONE thing:

    POST /upload    take the uploaded bytes, put them in S3, hand back
                     the public S3 URL for the frontend to use.

Files are named by their SHA-256 hash, so re-uploading the same file
never creates a duplicate object.

Auth: this uses whatever AWS credentials are already on this machine
(an `aws configure` profile, or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY
env vars) — boto3 finds them automatically. Nothing is hardcoded here.

Setup (one-time, in the AWS console, on the media-s3-knot bucket):
    1. Permissions → "Block public access" → turn OFF.
    2. Permissions → Bucket policy → allow public s3:GetObject
       (see backend/README.md for the policy JSON).

Run:
    pip install -r requirements.txt
    python3 media_server.py     # listens on http://127.0.0.1:8766
"""

import hashlib
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import boto3
from botocore.exceptions import ClientError

HOST = "127.0.0.1"
PORT = 8766

BUCKET_NAME = "media-s3-knot"
AWS_REGION = "us-east-1"

s3 = boto3.client("s3", region_name=AWS_REGION)


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Filename")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    # ── GET / — a cheap reachability check the frontend pings ──────
    def do_GET(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    # ── POST /upload — put the file in S3, return its public URL ───
    def do_POST(self):
        if self.path != "/upload":
            self.send_response(404)
            self._cors()
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        content_type = self.headers.get("Content-Type", "application/octet-stream")

        # Name the object by its content hash (dedupes identical uploads).
        digest = hashlib.sha256(body).hexdigest()
        original_name = self.headers.get("X-Filename", "")
        ext = os.path.splitext(original_name)[1]
        key = f"{digest}{ext}"

        try:
            s3.put_object(Bucket=BUCKET_NAME, Key=key, Body=body, ContentType=content_type)
        except ClientError as e:
            self.send_response(502)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(f'{{"error": "{e}"}}'.encode())
            return

        url = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(f'{{"url": "{url}"}}'.encode())

    def log_message(self, format, *args):
        print(f"media-s3-knot: {format % args}")


if __name__ == "__main__":
    print(f"media-s3-knot listening on http://{HOST}:{PORT}")
    print(f"Uploads go to s3://{BUCKET_NAME} ({AWS_REGION})")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
