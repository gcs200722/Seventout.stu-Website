import Image from "next/image";
import { landingImages } from "./data";

export function PlatformLandingHero() {
  return (
    <header className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0 -z-10">
        <Image
          src={landingImages.heroBackground}
          alt="Artisan working"
          fill
          sizes="100vw"
          className="floating h-full w-full object-cover opacity-20 grayscale"
        />
        <div className="hero-gradient absolute inset-0" />
      </div>
      <div className="reveal mx-auto max-w-4xl px-6 text-center md:px-16">
        <span className="mb-6 block text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
          Ke thua nghe thuat, phat trien cong nghe
        </span>
        <h1 className="mb-8 text-4xl leading-tight text-zinc-900 md:text-6xl">
          Xay dung thuong hieu thoi trang cua ban, khong can code.
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-lg text-zinc-600">
          Nen tang don gian nhat giup cac local brand Viet Nam toa sang truc tuyen. Tao website
          chuyen nghiep chi trong vai gio.
        </p>
        <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
          <button className="rounded-full bg-emerald-800 px-10 py-4 text-lg font-semibold text-white shadow-xl">
            Bat dau mien phi
          </button>
          <button className="rounded-full border border-zinc-300 px-10 py-4 text-lg font-semibold text-zinc-900 hover:bg-zinc-100">
            Xem cac mau giao dien
          </button>
        </div>
      </div>
      <div className="reveal mt-20 w-full max-w-5xl px-6 md:px-16" style={{ transitionDelay: "200ms" }}>
        <div className="rounded-xl border border-zinc-200/60 bg-white p-4 shadow-2xl">
          <Image
            src={landingImages.heroPreview}
            alt="Platform preview"
            width={1200}
            height={700}
            className="h-auto w-full rounded-lg shadow-inner"
          />
        </div>
      </div>
    </header>
  );
}
