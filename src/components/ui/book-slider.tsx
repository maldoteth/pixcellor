import React from 'react'
import HTMLFlipBook from "react-pageflip";

const pokemonData = [
  {
    id: "006",
    name: "Charizard",
    types: ["Fire", "Flying"],
    description: "Flies in search of strong opponents. Breathes extremely hot fire that melts anything, but never uses it on weaker foes."
  },
  {
    id: "025",
    name: "Pikachu",
    types: ["Electric"],
    description: "When Pikachu meet, they touch tails to exchange electricity as a greeting."
  },
  {
    id: "125",
    name: "Electabuzz",
    types: ["Electric"],
    description: "Often kept at power plants to regulate electricity. Competes with others to attract lightning during storms."
  },
  {
    id: "185",
    name: "Sudowoodo",
    types: ["Rock"],
    description: "Despite looking like a tree, its body is more like rock. Hates water and hides when it rains."
  },
  {
    id: "448",
    name: "Lucario",
    types: ["Fighting", "Steel"],
    description: "Can read thoughts and movements by sensing others' aura. No foe can hide from Lucario."
  },
  {
    id: "658",
    name: "Greninja",
    types: ["Water", "Dark"],
    description: "Creates throwing stars from compressed water that can slice through metal when thrown at high speed."
  },
  {
    id: "491",
    name: "Darkrai",
    types: ["Dark"],
    description: "A legendary Pokémon that appears on moonless nights, putting people to sleep and giving them nightmares."
  }
];

function BookSlider() {
  return (
    <div className="flex items-center justify-center w-full">
      {/* @ts-ignore */}
      <HTMLFlipBook
        width={300}
        height={400}
        size="stretch"
        minWidth={250}
        maxWidth={400}
        minHeight={350}
        maxHeight={500}
        showCover={true}
        mobileScrollSupport={true}
        className="shadow-2xl"
        style={{}}
        startPage={0}
        drawShadow={true}
        flippingTime={1000}
        usePortrait={true}
        startZIndex={0}
        autoSize={true}
        maxShadowOpacity={0.5}
        showPageCorners={true}
        disableFlipByClick={false}
        swipeDistance={30}
        clickEventForward={true}
        useMouseEvents={true}
      >
        {/* Cover Page */}
        <div className="bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold text-primary-foreground mb-4">Pokédex</h1>
            <p className="text-primary-foreground/80 text-sm">Flip to explore</p>
          </div>
        </div>

        {pokemonData.map((pokemon) => (
          <div 
            key={pokemon.id}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            <div className="h-full flex flex-col p-6">
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-4">
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${parseInt(pokemon.id)}.png`}
                    alt={pokemon.name}
                    className="w-32 h-32 mx-auto object-contain"
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {pokemon.name}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-3">
                    #{pokemon.id}
                  </p>
                  <div className="flex justify-center gap-2 mb-4">
                    {pokemon.types.map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {pokemon.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </HTMLFlipBook>
    </div>
  );
}

export default BookSlider;
