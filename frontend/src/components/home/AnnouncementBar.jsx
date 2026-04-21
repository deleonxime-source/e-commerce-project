function AnnouncementBar({ items }) {
  return (
    <div className="announcement-bar">
      {items.map((item, index) => (
        <div key={item} className="announcement-bar__slot">
          {index > 0 && <span className="announcement-bar__sep">◆</span>}
          <span className="announcement-bar__item">{item}</span>
        </div>
      ))}
    </div>
  );
}

export default AnnouncementBar;
