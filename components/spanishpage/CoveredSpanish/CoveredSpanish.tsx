"use client";
import React from "react";
import "@/app/globals.css";
import CardGrid from "@/components/common/CardGrid";

const CoveredSpanish = () => {
  const cards = [
    {
      img: "/icon/Mission.svg",
      imgHover: "/icon/Missionred.svg",
      title: "Nuestra Misión",
      description: "¿Por qué es tan importante la misión de VeteranPCS?",
      link: "about",
    },
    {
      img: "/icon/Impact.svg",
      imgHover: "/icon/Impactred.svg",
      title: "Impacto",
      description: "Las ventajas de VeteranPCS para nuestra comunidad militar.",
      link: "impact",
    },
    {
      img: "/icon/Loan.svg",
      imgHover: "/icon/Loanred.svg",
      title: "Préstamo VA",
      description: "Descubre más sobre cómo el préstamo VA puede ayudarte.",
      link: "blog/va-loan-eligibility-requirements-how-to-know-if-you-qualify-for-the-va-loan",
    },
    {
      img: "/icon/Works.svg",
      imgHover: "/icon/Worksred.svg",
      title: "¿Cómo funciona?",
      description: "¿Cómo funciona VeteranPCS?",
      link: "how-it-works",
    },
    {
      img: "/icon/Stories.svg",
      imgHover: "/icon/Storiesred.svg",
      title: "Historias",
      description: "¡Hemos ayudado a cientos de veteranos y sus familias!",
      link: "stories",
    },
    {
      img: "/icon/Resources.svg",
      imgHover: "/icon/Resourcesred.svg",
      title: "Recursos",
      description: "Descubre nuestros recursos confiables de VeteranPCS.",
      link: "pcs-resources",
    },
  ];

  return (
    <CardGrid
      cards={cards}
      title="Te tenemos a su familia en mente"
      subtitle="La comunidad militar ayudando a la comunidad militar a mudarse."
      learnMoreText="Más información"
    />
  );
};

export default CoveredSpanish;