import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

const PotionBlast = ({ onExit }) => {
  const gameContainer = useRef(null);
  const gameInstance = useRef(null);
  const [ws, setWs] = useState(null);

  // Game constants
  const FLEX_THRESHOLD = 2000;
  const TOUCH_THRESHOLD = 30;
  const ACCEL_SENSITIVITY = 0.5; // CHANGED: Reduced from 5 to 0.5

  // NEW: Add cooldown tracking for shooting
  const shootCooldownRef = useRef(false);
  const SHOOT_COOLDOWN_MS = 800; // NEW: Add 800ms cooldown between shots

  // WebSocket connection
  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket("ws://localhost:8080");

      socket.onopen = () => {
        console.log("Connected to WebSocket bridge");
        setWs(socket);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received data:", data); // Debug log
          if (gameInstance.current) {
            const scene = gameInstance.current.scene.getScene("default");
            if (scene) {
              scene.events.emit("sensorData", data);
            } else {
              console.error("Scene not found");
            }
          } else {
            console.error("Game instance not found");
          }
        } catch (err) {
          console.error("Data parsing error:", err);
        }
      };

      socket.onclose = () => {
        console.log("Reconnecting in 2 seconds...");
        setTimeout(connect, 2000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      return socket;
    };

    const socket = connect();

    return () => {
      if (socket) socket.close();
    };
  }, []);

  useEffect(() => {
    // Game configuration
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 700,
      backgroundColor: "#333",
      physics: { default: "arcade", arcade: { debug: false } },
      parent: gameContainer.current,
      scene: {
        preload: preload,
        create: create,
        update: update,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    function preload() {
      this.load.image("pink", "assets/pink_potion.png");
      this.load.image("green", "assets/green_potion.png");
      this.load.image("blue", "assets/blue_potion.png");
      this.load.image("yellow", "assets/yellow_potion.png");
      this.load.image("pink_star", "assets/pink_star.png");
      this.load.image("green_star", "assets/green_star.png");
      this.load.image("blue_star", "assets/blue_star.png");
      this.load.image("yellow_star", "assets/yellow_star.png");
      this.load.image("left_image", "assets/green_yellow.png");
      this.load.image("right_image", "assets/pink_blue.png");
    }

    function create() {
      // Game state
      const bubbleSize = 35;
      const colors = ["pink", "green", "blue", "yellow"];
      const colorNames = ["Pink", "Green", "Blue", "Yellow"];

      // Store all game objects as scene properties
      this.angle = 0;
      this.gameOver = false;
      this.gameWon = false;
      this.score = 0;

      // Physics setup
      this.physics.world.setBounds(0, 0, 600, 600);
      this.bubbles = this.physics.add.group();

      // Create game elements
      this.shooterBase = this.add.rectangle(300, 580, 100, 10, 0xffffff);
      this.shooter = this.add.sprite(300, 550, "pink_star").setScale(0.6);
      this.shooterColor = "pink";
      this.dottedLine = this.add.graphics();

      // Initialize UI
      this.scoreText = this.add
        .text(10, 10, "Score: 0", {
          fontSize: "20px",
          fontFamily: "'Arial Black', sans-serif",
          fill: "#fff",
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setDepth(10);

      // Add shooter color text
      this.shooterColorText = this.add
        .text(300, 625, "Pink", {
          fontSize: "22px",
          fontFamily: "'Arial Black', sans-serif",
          fill: "#fff",
          stroke: "#000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(4);

      // Create bubbles
      const rows = 7;
      const cols = 15;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * bubbleSize * 1.1 + bubbleSize / 2;
          const y = r * bubbleSize * 1.1 + 70;
          const colorKey = Phaser.Utils.Array.GetRandom(colors);
          const bubble = this.bubbles.create(x, y, colorKey).setScale(0.6);
          bubble.color = colorKey;
          bubble.body.setImmovable(true);
        }
      }

      // Create all needed methods bound to scene context
      this.createControls = createControls.bind(this);
      this.drawDottedLine = drawDottedLine.bind(this);
      this.changeShooterColor = changeShooterColor.bind(this);
      this.shootBubble = shootBubble.bind(this);
      this.changeAngle = changeAngle.bind(this);
      this.processSensorData = processSensorData.bind(this);

      // NEW: Add property to track shooting cooldown
      this.shootingCooldown = false;

      // Set up controls
      this.createControls();

      // Listen for sensor data
      this.events.on("sensorData", (data) => {
        console.log("Scene received sensor data:", data); // Debug log
        this.processSensorData(data);
      });
    }

    function update() {
      // Game update logic here
    }

    function processSensorData(data) {
      // Safety check for data format
      if (!data || !data.flex || !data.touch || !data.accel) {
        console.warn("Invalid sensor data format:", data);
        return;
      }

      const { flex, touch, accel } = data;

      // Debug log
      console.log("Processing sensor data:", {
        flex,
        touch,
        accel,
      });

      // 1. Handle potion color selection
      if (touch[4] < TOUCH_THRESHOLD) {
        if (touch[0] < TOUCH_THRESHOLD) this.changeShooterColor(1); // Green
        else if (touch[1] < TOUCH_THRESHOLD)
          this.changeShooterColor(3); // Yellow
        else if (touch[2] < TOUCH_THRESHOLD) this.changeShooterColor(0); // Pink
        else if (touch[3] < TOUCH_THRESHOLD) this.changeShooterColor(2); // Blue
      }

      // 2. Handle shooting with cooldown
      if (flex && flex[0] > FLEX_THRESHOLD && !this.shootingCooldown) {
        this.shootBubble(1.5);

        // CHANGED: Set cooldown flag to prevent rapid shooting
        this.shootingCooldown = true;

        // Reset cooldown after a delay
        setTimeout(() => {
          this.shootingCooldown = false;
        }, SHOOT_COOLDOWN_MS);
      }

      // 3. Handle aiming with reduced sensitivity
      if (accel && accel.length > 0) {
        const angleChange = accel[0] * ACCEL_SENSITIVITY;
        this.changeAngle(angleChange);
      }
    }

    function drawDottedLine() {
      this.dottedLine.clear();

      const length = 200;
      const dotSize = 2;
      const gapSize = 10;
      const radianAngle = Phaser.Math.DegToRad(this.angle - 90);

      this.dottedLine.fillStyle(0xffffff, 0.4);

      for (let i = 0; i < length; i += dotSize + gapSize) {
        const x = this.shooter.x + Math.cos(radianAngle) * i;
        const y = this.shooter.y + Math.sin(radianAngle) * i;
        this.dottedLine.fillCircle(x, y, dotSize);
      }

      const endX = this.shooter.x + Math.cos(radianAngle) * length;
      const endY = this.shooter.y + Math.sin(radianAngle) * length;

      this.dottedLine.fillStyle(0xffffff, 0.5);
      this.dottedLine.beginPath();
      this.dottedLine.moveTo(endX, endY);
      this.dottedLine.lineTo(
        endX - Math.cos(radianAngle - Math.PI / 6) * 15,
        endY - Math.sin(radianAngle - Math.PI / 6) * 15
      );
      this.dottedLine.lineTo(
        endX - Math.cos(radianAngle + Math.PI / 6) * 15,
        endY - Math.sin(radianAngle + Math.PI / 6) * 15
      );
      this.dottedLine.closePath();
      this.dottedLine.fillPath();
    }

    function changeShooterColor(index) {
      const colors = ["pink", "green", "blue", "yellow"];
      const colorNames = ["Pink", "Green", "Blue", "Yellow"];

      if (index >= 0 && index < colors.length) {
        this.shooterColor = colors[index];
        this.shooter.setTexture(this.shooterColor + "_star");
        this.shooterColorText.setText(colorNames[index]);
        this.drawDottedLine();
      }
    }

    function shootBubble(impactStrength = 1.0) {
      // Safety checks
      if (this.gameOver || this.gameWon || !this.shooter) {
        return;
      }

      // Clear previous dotted line
      this.dottedLine.clear();

      const speed = 600;
      const radianAngle = Phaser.Math.DegToRad(this.angle - 90);

      // Create projectile
      const star = this.physics.add
        .sprite(this.shooter.x, this.shooter.y, this.shooterColor + "_star")
        .setScale(0.6);

      star.color = this.shooterColor;
      star.setVelocity(
        speed * Math.cos(radianAngle),
        speed * Math.sin(radianAngle)
      );

      star.body.setCollideWorldBounds(true, 1, 1, 1);

      // Add auto-destroy after 3 seconds to prevent stars from accumulating
      this.time.delayedCall(3000, () => {
        if (star.active) {
          star.disableBody(true, true);
        }
      });

      // Set up collision
      this.physics.add.collider(
        star,
        this.bubbles,
        (shotStar, targetBottle) => {
          // Always destroy the star on any collision
          shotStar.disableBody(true, true);

          // If colors match, destroy bottles in radius
          if (shotStar.color === targetBottle.color) {
            const burstRadius = impactStrength * 100;

            const bubblesToBurst = this.bubbles
              .getChildren()
              .filter(
                (b) =>
                  b.active &&
                  b.color === shotStar.color &&
                  Phaser.Math.Distance.Between(
                    targetBottle.x,
                    targetBottle.y,
                    b.x,
                    b.y
                  ) <= burstRadius
              );

            bubblesToBurst.forEach((b) => b.disableBody(true, true));
            this.score += bubblesToBurst.length * 2;
            this.scoreText.setText("Score: " + this.score);

            if (
              this.bubbles.getChildren().filter((b) => b.active).length === 0
            ) {
              this.gameWon = true;
              this.add.text(200, 300, "You Won!", {
                fontSize: "48px",
                fill: "#0f0",
              });
            }
          }
          // If colors don't match, just destroy the star (already done above)
        }
      );
    }

    function changeAngle(delta) {
      this.angle = Phaser.Math.Clamp(this.angle + delta, -90, 90);
      this.shooterBase.rotation = Phaser.Math.DegToRad(this.angle);
      this.drawDottedLine();
    }

    function createControls() {
      // Exit button
      const exitBtn = this.add
        .text(750, 30, "✕", {
          fontSize: "32px",
          color: "#FF0000",
          backgroundColor: "#333333",
          padding: { x: 15, y: 5 },
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setInteractive({ useHandCursor: true });

      exitBtn.on("pointerdown", () => {
        onExit();
      });
    }

    // Initialize the game
    gameInstance.current = new Phaser.Game(config);

    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [onExit]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100%",
        backgroundColor: "#333",
      }}
    >
      <div ref={gameContainer} style={{ position: "relative" }} />
    </div>
  );
};

export default PotionBlast;
