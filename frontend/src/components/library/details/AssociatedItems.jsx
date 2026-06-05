/** @format */

/**
 * Renders a labelled list of associated items (aspects or metrics) as tags.
 * When onItemClick is provided the tags render as clickable buttons.
 * Used in the library detail panel for both aspect → metrics and metric → aspects.
 */
const AssociatedItems = ({ label, items, loading, onItemClick }) => (
  <div>
    <p className="is-size-7 is-uppercase has-text-grey" style={{ letterSpacing: "0.1em", marginBottom: "0.6rem" }}>
      {label}
    </p>
    {loading && <p className="has-text-grey is-size-7">Loading…</p>}
    {!loading && items.length === 0 && (
      <p className="has-text-grey is-size-7">None linked yet.</p>
    )}
    {!loading && items.length > 0 && (
      <div className="tags">
        {items.map((item) =>
          onItemClick ? (
            <button
              key={item.id}
              type="button"
              className="tag is-medium"
              style={{
                cursor: "pointer",
                background: "#fff8e6",
                border: "1.5px solid #ffc451",
                color: "#9a6f00",
              }}
              onClick={() => onItemClick(item)}
            >
              {item.label}
            </button>
          ) : (
            <span
              key={item.id}
              className="tag is-medium"
              style={{ background: "transparent", border: "1.5px solid #b5b5b5", cursor: "default" }}
            >
              {item.label}
            </span>
          )
        )}
      </div>
    )}
  </div>
);

export default AssociatedItems;
