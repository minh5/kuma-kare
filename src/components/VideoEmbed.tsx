interface VideoEmbedProps {
  videoId: string;
}

export default function VideoEmbed({ videoId }: VideoEmbedProps) {
  if (!videoId) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-stone-200">
      <iframe
        data-testid="video-embed"
        className="aspect-video w-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="Instructional video"
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
