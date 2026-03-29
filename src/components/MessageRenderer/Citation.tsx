const Citation = ({
  href,
  children,
  'data-index': dataIndex,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  'data-index'?: string;
  onClick?: (citationIndex: number, href: string) => void;
}) => {
  const index = dataIndex ? parseInt(dataIndex, 10) : null;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick && index) {
      e.preventDefault();
      onClick(index, href);
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      data-index={dataIndex}
      onClick={handleClick}
      className="bg-light-secondary dark:bg-dark-secondary hover:bg-light-200 dark:hover:bg-dark-200 px-1.5 py-0.5 rounded text-[10px] font-medium ml-0.5 no-underline text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors align-super leading-none cursor-pointer"
    >
      {children}
    </a>
  );
};

export default Citation;
