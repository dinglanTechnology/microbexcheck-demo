// Thin wrapper around ali-oss for uploading PDFs to Aliyun OSS.
// Only used by the import script — never imported by API route handlers.
import OSS from "ali-oss";

// Accept either OSS_-prefixed or bare env var names.
const accessKeyId = () => process.env.OSS_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID;
const accessKeySecret = () => process.env.OSS_ACCESS_KEY_SECRET || process.env.ACCESS_KEY_SECRET;

export function ossConfigured(): boolean {
  return !!(accessKeyId() && accessKeySecret());
}

function getClient(): OSS | null {
  if (!ossConfigured()) return null;

  const endpoint = process.env.OSS_ENDPOINT;
  const opts: OSS.Options = {
    accessKeyId: accessKeyId()!,
    accessKeySecret: accessKeySecret()!,
    bucket: process.env.OSS_BUCKET,
    secure: true,
  };

  // A non-aliyuncs endpoint is treated as a bound custom domain (CNAME).
  if (endpoint && !/aliyuncs\.com/i.test(endpoint)) {
    opts.endpoint = endpoint;
    opts.cname = true;
  } else {
    opts.region = process.env.OSS_REGION;
    if (endpoint) opts.endpoint = endpoint;
  }
  return new OSS(opts);
}

/** Uploads a local file and returns its public URL. Throws if OSS unconfigured. */
export async function uploadFile(localPath: string, objectKey: string): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("OSS not configured (missing access key/secret)");
  const res = await client.put(objectKey, localPath);
  return res.url;
}
