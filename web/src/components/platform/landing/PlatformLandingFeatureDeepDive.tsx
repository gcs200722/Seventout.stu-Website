import Image from "next/image";
import { landingImages } from "./data";

export function PlatformLandingFeatureDeepDive() {
  return (
    <section className="overflow-hidden bg-white py-28">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:px-16">
        <div className="reveal lg:w-1/2">
          <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-emerald-800">
            Trinh bien tap thong minh
          </span>
          <h2 className="mb-8 text-4xl">Trai nghiem thiet ke nhu dang dan trang tap chi.</h2>
          <p className="mb-8 text-lg leading-relaxed text-zinc-600">
            Atelier cung cap bo cong cu truc quan hoa moi y tuong sang tao. Tu layout den typography,
            moi thu deu dien ra muot ma tren cung mot man hinh.
          </p>
          <ul className="space-y-4 text-zinc-700">
            <li>• Toi uu hoa hinh anh lookbook</li>
            <li>• Quan ly kho hang thong minh</li>
          </ul>
        </div>
        <div className="reveal relative lg:w-1/2" style={{ transitionDelay: "200ms" }}>
          <div className="img-hover-zoom aspect-[4/5] overflow-hidden rounded-3xl bg-zinc-100 shadow-2xl">
            <Image
              src={landingImages.featureEditor}
              alt="Editor interface"
              width={900}
              height={1125}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="floating absolute -bottom-8 -left-8 max-w-[240px] rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Live preview</p>
            <p className="mt-2 text-sm text-zinc-600">
              Thay doi duoc cap nhat ngay lap tuc tren moi thiet bi di dong.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
