import React, { useState } from "react";
import { motion } from "framer-motion";
import "./GameLanding.css";

const games = [
    {
        name: "Bubble Shooter",
        description: "Pop bubbles with precise movements!",
        image: "bubble.png",

    }
];

export default function Landing() {
    const [selectedGame, setSelectedGame] = useState(null);

    const gameVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 10
            }
        }
    };

    return (
        <div className="container">
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="title"
            >
                Welcome to Flexora!
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="subtitle"
            >
                Use your glove to play interactive and fun games.
            </motion.p>

            <motion.div
                className="game-grid"
                initial="hidden"
                animate="visible"
                variants={gameVariants}
            >
                {games.map((game, index) => (
                    <motion.div
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        className={`game-card ${selectedGame === game.name ? "selected" : ""}`}
                        onClick={() => setSelectedGame(game.name)}
                        variants={gameVariants}
                    >
                        <div className="card">
                            {game.icon}
                            <img src={game.image} alt={game.name} className="game-image" />
                            <div className="card-content">
                                <h2>{game.name}</h2>
                                <p>{game.description}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {selectedGame && (
                <motion.button
                    className="start-button"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => alert(`Starting ${selectedGame}`)}
                >
                    Start {selectedGame}
                </motion.button>
            )}
        </div>
    );
}