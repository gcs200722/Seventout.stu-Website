import Image from "next/image";
import { showcaseCards } from "./data";

export function PlatformLandingShowcase() {
  return (
    <section id="templates" className="overflow-hidden bg-[#fdf8f8] py-28">
      <div className="reveal mx-auto mb-12 max-w-4xl px-6 text-center md:px-16">
        <h2 className="mb-4 text-4xl">Cam hung tu cong dong</h2>
        <p className="text-zinc-600">Kham pha cach cac thuong hieu dang chuyen minh cung Atelier.</p>
      </div>
      <div className="reveal no-scrollbar flex gap-8 overflow-x-auto px-8 pb-12" style={{ transitionDelay: "200ms" }}>
        {showcaseCards.map((card, index) => (
          <article
            key={card.title}
            className={`group w-[340px] flex-shrink-0 ${index === 1 ? "mt-12" : ""}`}
          >
            <div className="img-hover-zoom relative mb-5 aspect-[3/4] overflow-hidden rounded-3xl bg-zinc-100">
              <Image
                src={card.image}
                alt={card.title}
                width={680}
                height={900}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-900/10 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="rounded-full bg-white px-7 py-3 font-bold text-zinc-900 shadow-lg">
                  Xem mau nay
                </button>
              </div>
            </div>
            <h4 className="text-xl">{card.title}</h4>
            <p className="text-sm text-zinc-600">{card.subtitle}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
