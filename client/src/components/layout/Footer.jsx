import { Link } from 'react-router';
import { useCategories, useSettings } from '../../context/StoreContext.jsx';
import { NewsletterForm } from '../Newsletter.jsx';

const Column = ({ title, children }) => (
  <div>
    <h3 className="eyebrow mb-5 text-paper/50">{title}</h3>
    <ul className="space-y-3 text-sm">{children}</ul>
  </div>
);

const FooterLink = ({ to, children }) => (
  <li>
    <Link to={to} className="link">
      {children}
    </Link>
  </li>
);

const Footer = () => {
  const settings = useSettings();
  const categories = useCategories();
  const store = settings?.store;

  return (
    <footer className="bg-ink text-paper">
      <div className="shell pb-10 pt-16 md:pt-24">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_1.6fr]">
          <div className="max-w-md">
            <h2 className="display text-4xl md:text-5xl">First access to every drop.</h2>
            <NewsletterForm dark className="mt-8" />
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <Column title="Shop">
              <FooterLink to="/shop">All pieces</FooterLink>
              {categories.slice(0, 5).map((category) => (
                <FooterLink key={category.id} to={`/shop?category=${category.slug}`}>
                  {category.name}
                </FooterLink>
              ))}
            </Column>
            <Column title="TFF">
              <FooterLink to="/collections">Collections</FooterLink>
              <FooterLink to="/lookbook">Lookbook</FooterLink>
              <FooterLink to="/account">Account</FooterLink>
              <FooterLink to="/wishlist">Wishlist</FooterLink>
            </Column>
            <Column title="Help">
              <FooterLink to="/track">Track an order</FooterLink>
              {store?.contactEmail && (
                <li>
                  <a href={`mailto:${store.contactEmail}`} className="link">
                    {store.contactEmail}
                  </a>
                </li>
              )}
              {store?.instagram && (
                <li>
                  <a href={store.instagram} target="_blank" rel="noreferrer" className="link">
                    Instagram
                  </a>
                </li>
              )}
            </Column>
          </div>
        </div>

        {/* The wordmark closes the page, the way a masthead opens a magazine */}
        <p className="wordmark mt-20 select-none text-[34vw] leading-[0.72] text-paper md:mt-28 md:text-[24vw]" aria-hidden="true">
          TFF
        </p>

        <div className="mt-10 flex flex-col gap-3 border-t border-paper/15 pt-6 text-xs text-paper/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} TFF. All rights reserved.</p>
          <p>Designed in Lagos.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
