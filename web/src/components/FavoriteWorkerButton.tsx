"use client";

import { useTranslations } from "next-intl";

import { KEY, useStoredState } from "@/lib/storage";

// A contractor's personal "talent pool" — favourited workers kept on the device.
// (Server-backed favourites + invite-first flow are specced in BLOCKERS.md §2.6.)
export type FavoriteWorker = { id: string; name: string };

export function useFavoriteWorkers() {
  return useStoredState<FavoriteWorker[]>(KEY.favoriteWorkers, []);
}

export function FavoriteWorkerButton({
  workerId,
  workerName,
  className = "",
}: {
  workerId: string;
  workerName: string;
  className?: string;
}) {
  const t = useTranslations("favorites");
  const [list, setList] = useFavoriteWorkers();
  const isFav = list.some((f) => f.id === workerId);

  const toggle = () =>
    setList((prev) =>
      prev.some((f) => f.id === workerId)
        ? prev.filter((f) => f.id !== workerId)
        : [...prev, { id: workerId, name: workerName }],
    );

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFav}
      aria-label={isFav ? t("remove") : t("add")}
      title={isFav ? t("remove") : t("add")}
      className={`text-lg leading-none transition ${
        isFav ? "text-amber-500" : "text-gray-300 hover:text-amber-400"
      } ${className}`}
    >
      {isFav ? "★" : "☆"}
    </button>
  );
}
