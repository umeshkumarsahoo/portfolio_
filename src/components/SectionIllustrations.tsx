import React from "react";
import {
  DeskSceneIllustration,
  BotanicalFlowerIllustration,
  WindowGazerIllustration,
  TrioFriendsIllustration,
  TwilightSeaIllustration,
  CoffeeAndPillsIllustration,
  CurledSilhouetteIllustration,
  GazingProfileIllustration,
} from "./ZineIllustrations";

export {
  DeskSceneIllustration,
  BotanicalFlowerIllustration,
  WindowGazerIllustration,
  TrioFriendsIllustration,
  TwilightSeaIllustration,
  CoffeeAndPillsIllustration,
  CurledSilhouetteIllustration,
  GazingProfileIllustration,
};

// Aliases mapped to the graphic novel reference:
export function HomeIllustration(props: { className?: string }) {
  return <DeskSceneIllustration {...props} />;
}

export function AboutIllustration(props: { className?: string }) {
  return <WindowGazerIllustration {...props} />;
}

export function ExperienceIllustration(props: { className?: string }) {
  return <TrioFriendsIllustration {...props} inverted={false} />;
}

export function ProjectsIllustration(props: { className?: string }) {
  return <TwilightSeaIllustration {...props} />;
}

export function SkillsIllustration(props: { className?: string }) {
  return <CoffeeAndPillsIllustration {...props} />;
}

export function AchievementsIllustration(props: { className?: string }) {
  return <GazingProfileIllustration {...props} inverted={false} />;
}

export function ContactIllustration(props: { className?: string }) {
  return <CurledSilhouetteIllustration {...props} />;
}

export function UmuAiIllustration(props: { className?: string }) {
  return <BotanicalFlowerIllustration {...props} />;
}
