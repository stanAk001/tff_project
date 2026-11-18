import { useState } from 'react';
import Modal from '../ui/Modal.jsx';

// Reusable size guide. `guide` is { unit, columns: [...], rows: [[...], ...] },
// set per category in Admin → Categories.
const SizeGuide = ({ guide, categoryName }) => {
  const [open, setOpen] = useState(false);
  if (!guide?.rows?.length) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="link-underlined text-[0.8125rem] text-graphite">
        Size guide
      </button>
      <Modal open={open} onClose={() => setOpen(false)} side="right" title="Size guide">
        <div className="px-5 py-8 md:px-8">
          <h3 className="display text-4xl">{categoryName || 'Measurements'}</h3>
          <p className="mt-3 text-sm text-graphite">
            Garment measurements in {guide.unit === 'in' ? 'inches' : 'centimetres'}. Between sizes? Size up for a looser fit.
          </p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink">
                  {guide.columns.map((column) => (
                    <th key={column} scope="col" className="eyebrow py-3 pr-4 text-[0.625rem] font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-mist">
                    {guide.columns.map((column, cellIndex) =>
                      cellIndex === 0 ? (
                        <th key={column} scope="row" className="py-3.5 pr-4 font-medium">
                          {row[cellIndex]}
                        </th>
                      ) : (
                        <td key={column} className="py-3.5 pr-4 tabular-nums text-graphite">
                          {row[cellIndex] || '—'}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SizeGuide;
