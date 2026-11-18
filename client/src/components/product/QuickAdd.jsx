import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useCart } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { naira } from '../../utils/format.js';
import Button from '../ui/Button.jsx';
import Media from '../ui/Media.jsx';
import Modal from '../ui/Modal.jsx';
import VariantSelector, { findVariant, firstAvailableColour } from './VariantSelector.jsx';

// Choose a colour and size and add to the bag without leaving the page.
const QuickAdd = ({ product, open, onClose }) => {
  const cart = useCart();
  const toast = useToast();
  const [colour, setColour] = useState(null);
  const [size, setSize] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setColour(firstAvailableColour(product));
    setSize(product.sizes.length === 1 ? product.sizes[0] : null);
  }, [open, product]);

  if (!product) return null;
  const variant = size ? findVariant(product.variants, colour, size) : null;

  const add = async () => {
    if (!variant) return;
    setAdding(true);
    try {
      await cart.add(variant.id, 1);
      onClose();
    } catch (error) {
      toast.error(error.message);
      cart.refresh();
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Quick add">
      <div className="p-5 md:p-8">
        <div className="flex gap-5">
          <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden">
            <Media
              src={product.images[0]?.url}
              alt=""
              tone={product.colours.find((c) => c.name === colour)?.hex}
              sizes="96px"
              maxWidth={320}
              compactPlaceholder
            />
          </div>
          <div>
            <p className="display text-2xl">{product.name}</p>
            <p className="mt-1 text-graphite">{naira(product.price)}</p>
            <Link to={`/products/${product.slug}`} className="eyebrow link-underlined mt-4 inline-block text-[0.625rem]">
              View full details
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <VariantSelector
            product={product}
            colour={colour}
            size={size}
            onColour={(next) => {
              setColour(next);
              if (size && !findVariant(product.variants, next, size)?.stock) setSize(null);
            }}
            onSize={setSize}
          />
        </div>

        <Button full className="mt-8" onClick={add} loading={adding} disabled={!variant || variant.stock === 0}>
          {variant ? 'Add to bag' : 'Select a size'}
        </Button>
      </div>
    </Modal>
  );
};

export default QuickAdd;
