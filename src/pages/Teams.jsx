import React from "react";
import { FEED, TEAM } from "@/lib/assets";
import SectionHeading from "@/components/site/SectionHeading";
import TeamCard from "@/components/site/TeamCard";

const COLLAGE = [
  { src: FEED[0], ratio: "aspect-[4/5]" },
  { src: FEED[1], ratio: "aspect-[4/5]" },
  { src: FEED[2], ratio: "aspect-square" },
  { src: FEED[3], ratio: "aspect-square" },
  { src: FEED[4], ratio: "aspect-[4/5]" },
  { src: FEED[5], ratio: "aspect-[4/5]" },
];

export default function Teams() {
  return (
    <div className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading label="OUR TEAM" title="The people behind the chair" className="mb-14" />
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="flex flex-col gap-6">
            {TEAM.map((m) => (
              <TeamCard key={m.slug} member={m} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {COLLAGE.map((c, i) => (
              <div key={i} className={`${c.ratio} overflow-hidden rounded-2xl bg-muted`}>
                <img
                  src={c.src}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
