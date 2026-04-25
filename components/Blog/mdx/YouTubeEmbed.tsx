type Props = {
  id: string;
  title?: string;
};

export default function YouTubeEmbed({ id, title = 'YouTube video' }: Props) {
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  return (
    <div className="my-6 aspect-video w-full overflow-hidden rounded-xl">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}
