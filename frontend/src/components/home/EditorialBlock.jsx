import { Link } from "react-router-dom";

export default function EditorialBlock() {
  return (
    <>
      {/* FIRST BLOCK — TEXT + IMAGE */}
      <section className="editorial-block">
        <div className="editorial-block__content">
          <p className="editorial-block__season">Spring/Summer 2026</p>

          <p className="editorial-block__text">
            A silhouette that is straight, structured and rooted in our own archive.
          </p>

          <Link to="/products" className="editorial-block__cta">
            DISCOVER MORE →
          </Link>
        </div>

        <div className="editorial-block__image">
          <img
            src="/images/website/editorial-ss2026.jpg"
            alt="Spring Summer 2026"
          />
        </div>
      </section>

      {/* SECOND BLOCK — IMAGE ONLY */}
      <section className="editorial-block editorial-block--image-only">
        <div className="editorial-block__image">
          <img
            src="/images/website/editorial-2.jpg"
            alt="Editorial Visual"
          />
        </div>
      </section>
    </>
  );
}
