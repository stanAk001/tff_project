import { useEffect } from 'react';

const SITE = 'TFF';
const DEFAULT_DESCRIPTION = 'TFF is a modern fashion label. Limited drops, considered essentials.';

const setMeta = (selector, create, content) => {
  let element = document.head.querySelector(selector);
  if (!content) {
    element?.remove();
    return;
  }
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  element.setAttribute(element.tagName === 'LINK' ? 'href' : 'content', content);
};

const meta = (attribute, name) => () => {
  const element = document.createElement('meta');
  element.setAttribute(attribute, name);
  return element;
};

// Sets the page title, description, canonical URL, social-sharing tags and
// (optionally) structured data for the current page.
export const useSeo = ({ title, description, image, type = 'website', noindex = false, jsonLd } = {}) => {
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE}` : `${SITE} — More than what you wear`;
    const text = (description || DEFAULT_DESCRIPTION).slice(0, 300);
    const url = window.location.origin + window.location.pathname;

    document.title = fullTitle;
    setMeta('meta[name="description"]', meta('name', 'description'), text);
    setMeta('meta[name="robots"]', meta('name', 'robots'), noindex ? 'noindex, nofollow' : '');
    setMeta('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), noindex ? '' : url);
    setMeta('meta[property="og:title"]', meta('property', 'og:title'), fullTitle);
    setMeta('meta[property="og:description"]', meta('property', 'og:description'), text);
    setMeta('meta[property="og:type"]', meta('property', 'og:type'), type);
    setMeta('meta[property="og:url"]', meta('property', 'og:url'), url);
    setMeta('meta[property="og:image"]', meta('property', 'og:image'), image || '');
    setMeta('meta[name="twitter:card"]', meta('name', 'twitter:card'), image ? 'summary_large_image' : 'summary');

    let script = document.head.querySelector('script[data-seo="jsonld"]');
    if (jsonLdText) {
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.seo = 'jsonld';
        document.head.appendChild(script);
      }
      script.textContent = jsonLdText;
    } else {
      script?.remove();
    }
  }, [title, description, image, type, noindex, jsonLdText]);
};

// Component form, for pages that only know their title after deciding what to render.
export const Seo = (props) => {
  useSeo(props);
  return null;
};
