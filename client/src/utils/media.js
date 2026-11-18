// Image delivery helpers. Images from Cloudinary (uploads) and Unsplash (demo
// photography) are requested at the size the layout needs, compressed and in a
// modern format, so the browser never downloads a full-size original.

const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(.+)$/;
const UNSPLASH = /^https:\/\/images\.unsplash\.com\//;

const isCloudinary = (url) => CLOUDINARY.test(url || '');
const isUnsplash = (url) => UNSPLASH.test(url || '');

export const resized = (url, width) => {
  if (isUnsplash(url)) {
    const [base] = url.split('?');
    return `${base}?auto=format&fit=max&q=75&w=${width}`;
  }
  const match = url?.match(CLOUDINARY);
  if (!match) return url;
  return `${match[1]}f_auto,q_auto,c_limit,w_${width}/${match[2]}`;
};

const WIDTHS = [320, 480, 640, 800, 1080, 1440, 1920, 2400];

export const srcSet = (url, maxWidth = 2400) => {
  if (!isCloudinary(url) && !isUnsplash(url)) return undefined;
  return WIDTHS.filter((width) => width <= maxWidth)
    .map((width) => `${resized(url, width)} ${width}w`)
    .join(', ');
};

// A compressed, capped-width video stream
export const videoSrc = (url, width = 1600) => {
  const match = url?.match(CLOUDINARY);
  if (!match) return url;
  return `${match[1]}f_auto,q_auto,c_limit,w_${width}/${match[2]}`;
};
