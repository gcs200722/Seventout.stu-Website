import type { Collection } from "@/components/home/CollectionCard";
import { EditorialCollectionCard } from "@/components/home/EditorialCollectionCard";

type EditorialFeaturedCollectionsProps = {
  collections: Collection[];
};

export function EditorialFeaturedCollections({ collections }: EditorialFeaturedCollectionsProps) {
  if (collections.length === 0) return null;

  if (collections.length === 1) {
    return (
      <div className="min-h-[min(70vh,520px)]">
        <EditorialCollectionCard collection={collections[0]} />
      </div>
    );
  }

  const [first, ...rest] = collections;

  if (collections.length === 2) {
    return (
      <div className="grid min-h-[280px] gap-5 lg:grid-cols-2">
        <EditorialCollectionCard collection={first} />
        <EditorialCollectionCard collection={rest[0]} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:grid-rows-2 lg:gap-5">
      <div className="min-h-[min(55vh,560px)] lg:col-span-7 lg:row-span-2">
        <EditorialCollectionCard collection={first} />
      </div>
      {rest[0] ? (
        <div className="min-h-[240px] lg:col-span-5 lg:row-start-1">
          <EditorialCollectionCard collection={rest[0]} />
        </div>
      ) : null}
      {rest[1] ? (
        <div className="min-h-[240px] lg:col-span-5 lg:row-start-2">
          <EditorialCollectionCard collection={rest[1]} />
        </div>
      ) : null}
      {rest.length > 2 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-3">
          {rest.slice(2).map((c) => (
            <div key={c.id} className="min-h-[220px]">
              <EditorialCollectionCard collection={c} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
