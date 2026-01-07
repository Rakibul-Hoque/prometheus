const MIME_MAP: Record<string, string> = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    css: "text/css; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    txt: "text/plain; charset=utf-8",
    text : "text/plain; charset=utf-8",

    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",

    pdf: "application/pdf",
    zip: "application/zip",

    mp3: "audio/mpeg",
    mp4: "video/mp4"
};

export function getMimeType(input: string): string | undefined {
    const ext = input.includes(".") ? input.split(".").pop() : input;

    if (!ext) return undefined;
    return MIME_MAP[ext.toLowerCase()];
}
