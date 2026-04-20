type CmsVideoBlockProps = {
  srcMp4: string;
  srcWebm: string;
  poster: string;
  loop: boolean;
  muted: boolean;
};

export function CmsVideoBlock({ srcMp4, srcWebm, poster, loop, muted }: CmsVideoBlockProps) {
  return (
    <div className="relative w-full overflow-hidden bg-sevenout-black">
      <video
        className="aspect-video w-full object-cover"
        playsInline
        controls
        loop={loop}
        muted={muted}
        poster={poster.trim() || undefined}
        preload="metadata"
      >
        {srcWebm.trim() ? <source src={srcWebm.trim()} type="video/webm" /> : null}
        {srcMp4.trim() ? <source src={srcMp4.trim()} type="video/mp4" /> : null}
      </video>
    </div>
  );
}
