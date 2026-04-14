import type { Collection } from "@/components/home/CollectionCard";
import type { Product } from "@/components/home/ProductCard";

export const heroContent = {
  title: "Nang cap tu do voi tinh than local brand",
  subtitle:
    "Khám phá BST streetwear tối giản, form dễ mặc và phối đồ linh hoạt cho mọi hoạt động hằng ngày.",
  ctaLabel: "Shop Now",
  image:
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
};

export const collections: Collection[] = [
  {
    id: "col-1",
    title: "Urban Essentials",
    cta: "Shop Collection",
    slug: "#",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "col-2",
    title: "Mono Tone Series",
    cta: "Explore More",
    slug: "#",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "col-3",
    title: "Weekend Casual",
    cta: "View Looks",
    slug: "#",
    image:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "col-4",
    title: "Accessories Drop",
    cta: "See Items",
    slug: "#",
    image:
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
  },
];

export const bestSellingProducts: Product[] = [
  {
    id: "bs-1",
    name: "Oversized Tee - Ivory",
    price: 289000,
    originalPrice: 359000,
    image:
      "https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "bs-2",
    name: "Boxy Hoodie - Charcoal",
    price: 549000,
    originalPrice: 649000,
    image:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "bs-3",
    name: "Straight Fit Pants - Black",
    price: 499000,
    image:
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "bs-4",
    name: "Classic Cap - Beige",
    price: 199000,
    originalPrice: 249000,
    image:
      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "bs-5",
    name: "Minimal Tote Bag",
    price: 259000,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "bs-6",
    name: "Local Denim Jacket",
    price: 689000,
    originalPrice: 789000,
    image:
      "https://images.unsplash.com/photo-1551232864-3f0890e580d9?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "bs-7",
    name: "Daily Socks Set",
    price: 99000,
    image:
      "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "bs-8",
    name: "Relax Shorts - Sand",
    price: 299000,
    originalPrice: 369000,
    image:
      "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=800&q=80",
  },
];

export const newArrivals: Product[] = [
  {
    id: "na-1",
    name: "Zip Jacket - Moss Green",
    price: 629000,
    image:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "na-2",
    name: "Structured Shirt - White",
    price: 419000,
    originalPrice: 459000,
    image:
      "https://images.unsplash.com/photo-1467043153537-a4fba2cd39ef?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "na-3",
    name: "Cargo Pants - Olive",
    price: 559000,
    image:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "na-4",
    name: "Canvas Sneaker - Cream",
    price: 739000,
    originalPrice: 829000,
    image:
      "https://images.unsplash.com/photo-1549298916-f52d724204b4?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "na-5",
    name: "Crossbody Bag - Black",
    price: 349000,
    image:
      "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "na-6",
    name: "Layer Tank - Grey",
    price: 219000,
    image:
      "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=800&q=80",
  },
];

export const promotion = {
  title: "Mid Season Sale - Up to 40% Off",
  description:
    "Áp dụng cho selected items trong 72 giờ. Số lượng giới hạn, ưu đãi kết thúc khi hết hàng.",
  ctaLabel: "Shop Deals",
};
