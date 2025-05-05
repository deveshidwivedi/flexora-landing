import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

const PotionBlast = ({ onExit }) => {
  const gameContainer = useRef(null);
  const gameInstance = useRef(null);
  const [ws, setWs] = useState(null);

  // Game constants
  const FLEX_THRESHOLD = 2500;
  const TOUCH_THRESHOLD = 30;
  const ACCEL_SENSITIVITY = 5;

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
          if (gameInstance.current) {
            const scene = gameInstance.current.scene.getScene('default');
            scene.events.emit('sensorData', data);
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
      }
    };

    // Game variables
    let bubbles, shooter, shooterColor, angle, dottedLine;
    let scoreText, shooterColorText, cheerMessage, shooterBase;
    let instructionsButton, instructionsText, closeButton;
    let shouldShowInstructions = true;
    let instructionElements = [];

    // Game scene functions
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
      angle = 0;

      // Physics setup
      this.physics.world.setBounds(0, 0, 600, 600);
      bubbles = this.physics.add.group();

      // Create game elements
      createBottomPanel.call(this);
      createShooter.call(this);
      addScoreText.call(this);
      createBubbles.call(this);
      createControls.call(this);
      createInstructions.call(this);

      // Event for adding new rows
      this.time.addEvent({
        delay: 15000,
        callback: addNewRow,
        callbackScope: this,
        loop: true,
      });

      // Dotted line for aiming
      dottedLine = this.add.graphics();

      // Listen for sensor data
      this.events.on('sensorData', processSensorData);
    }

    function update() {
      if (shouldShowInstructions) {
        this.physics.pause();
      } else {
        this.physics.resume();
      }
    }

    function processSensorData(data) {
      const { flex, touch, accel } = data;

      // 1. Handle potion color selection
      if (touch[4] < TOUCH_THRESHOLD) { // Thumb pressed
        if (touch[0] < TOUCH_THRESHOLD) changeShooterColor.call(this, 1);    // Green
        else if (touch[1] < TOUCH_THRESHOLD) changeShooterColor.call(this, 3); // Yellow
        else if (touch[2] < TOUCH_THRESHOLD) changeShooterColor.call(this, 0); // Pink
        else if (touch[3] < TOUCH_THRESHOLD) changeShooterColor.call(this, 2); // Blue
      }

      // 2. Handle shooting
      const avgFlex = (flex[0] + flex[1] + flex[2] + flex[3]) / 4;
      if (avgFlex > FLEX_THRESHOLD) {
        const strength = Phaser.Math.Clamp(avgFlex / 3000, 0.5, 1.5);
        shootBubble.call(this, strength);
      }

      // 3. Handle aiming
      const angleChange = accel[0] * ACCEL_SENSITIVITY;
      changeAngle.call(this, angleChange);
    }

    function createBottomPanel() {
      this.add.image(100, 600, "left_image").setScale(0.5).setOrigin(0.5).setInteractive();
      this.add.image(500, 600, "right_image").setScale(0.5).setOrigin(0.5).setInteractive();
    }

    function createShooter() {
      shooterBase = this.add.rectangle(300, 580, 100, 10, 0xffffff);
      shooter = this.add.sprite(300, 550, "pink_star").setScale(0.6);
      shooterColor = "pink";
      addShooterColorText.call(this);
    }

    function createBubbles() {
      const bubbleSize = 35;
      const rows = 7;
      const cols = 15;
      const colors = ["pink", "green", "blue", "yellow"];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * bubbleSize * 1.1 + bubbleSize / 2;
          const y = r * bubbleSize * 1.1 + 70;
          const colorKey = Phaser.Utils.Array.GetRandom(colors);
          const bubble = bubbles.create(x, y, colorKey).setScale(0.6);
          bubble.color = colorKey;
          bubble.body.setImmovable(true);
        }
      }
    }

    function drawDottedLine() {
      dottedLine.clear();

      const length = 200;
      const dotSize = 2;
      const gapSize = 10;
      const radianAngle = Phaser.Math.DegToRad(angle - 90);

      dottedLine.fillStyle(0xffffff, 0.4);

      for (let i = 0; i < length; i += dotSize + gapSize) {
        const x = shooter.x + Math.cos(radianAngle) * i;
        const y = shooter.y + Math.sin(radianAngle) * i;
        dottedLine.fillCircle(x, y, dotSize);
      }

      const endX = shooter.x + Math.cos(radianAngle) * length;
      const endY = shooter.y + Math.sin(radianAngle) * length;

      dottedLine.fillStyle(0xffffff, 0.5);
      dottedLine.beginPath();
      dottedLine.moveTo(endX, endY);
      dottedLine.lineTo(
        endX - Math.cos(radianAngle - Math.PI / 6) * 15,
        endY - Math.sin(radianAngle - Math.PI / 6) * 15
      );
      dottedLine.lineTo(
        endX - Math.cos(radianAngle + Math.PI / 6) * 15,
        endY - Math.sin(radianAngle + Math.PI / 6) * 15
      );
      dottedLine.closePath();
      dottedLine.fillPath();
    }

    function changeShooterColor(index) {
      const colors = ["pink", "green", "blue", "yellow"];
      const colorNames = ["Pink", "Green", "Blue", "Yellow"];
      
      if (index >= 0 && index < colors.length) {
        shooterColor = colors[index];
        shooter.setTexture(shooterColor + "_star");
        shooterColorText.setText(colorNames[index]);
        drawDottedLine.call(this);
      }
    }

    function shootBubble(impactStrength = 1.0) {
      const speed = 600;
      const colors = ["pink", "green", "blue", "yellow"];

      if (this.gameOver || this.gameWon) return;
      dottedLine.clear();

      const normalizedImpact = Phaser.Math.Clamp(impactStrength, 0.5, 1.5);
      const radianAngle = Phaser.Math.DegToRad(angle - 90);

      const star = this.physics.add
        .sprite(shooter.x, shooter.y, shooterColor + "_star")
        .setScale(0.6);

      star.color = shooterColor;
      star.impactStrength = normalizedImpact;
      star.setVelocity(
        speed * Math.cos(radianAngle),
        speed * Math.sin(radianAngle)
      );

      star.body.setCollideWorldBounds(true, true, true, false);

      this.physics.add.collider(star, bubbles, (shotStar, targetBottle) => {
        if (!shotStar.active || shotStar.color !== targetBottle.color) return;

        shotStar.disableBody(true, true);
        const burstRadius = shotStar.impactStrength * 100;

        const bubblesToBurst = bubbles.getChildren().filter(b => 
          b.active && 
          b.color === shotStar.color &&
          Phaser.Math.Distance.Between(targetBottle.x, targetBottle.y, b.x, b.y) <= burstRadius
        );

        bubblesToBurst.forEach(b => b.disableBody(true, true));
        this.score += bubblesToBurst.length * 2;
        scoreText.setText("Score: " + this.score);

        if (bubbles.getChildren().filter(b => b.active).length === 0) {
          this.gameWon = true;
          this.add.text(200, 300, "You Won!", { fontSize: "48px", fill: "#0f0" });
        }
      });
    }

    function addNewRow() {
      const bubbleSize = 35;
      const cols = 15;
      const colors = ["pink", "green", "blue", "yellow"];

      if (this.gameOver || this.gameWon) return;

      bubbles.getChildren().forEach(bubble => {
        if (bubble.active) {
          bubble.y += bubbleSize * 1.1;
          if (bubble.y >= 550) {
            this.gameOver = true;
            this.add.text(200, 300, "Game Over", { fontSize: "32px", fill: "#fff" });
          }
        }
      });

      for (let c = 0; c < cols; c++) {
        const x = c * bubbleSize * 1.1 + bubbleSize / 2;
        const y = 70;
        const colorKey = Phaser.Utils.Array.GetRandom(colors);
        const bubble = bubbles.create(x, y, colorKey).setScale(0.6);
        bubble.color = colorKey;
        bubble.body.setImmovable(true);
      }
    }

    function changeAngle(delta) {
      angle = Phaser.Math.Clamp(angle + delta, -90, 90);
      shooterBase.rotation = Phaser.Math.DegToRad(angle);
      drawDottedLine.call(this);
    }

    function addScoreText() {
      this.score = 0;
      scoreText = this.add.text(10, 10, "Score: 0", {
        fontSize: "20px",
        fontFamily: "'Arial Black', sans-serif",
        fill: "#fff",
        stroke: "#000000",
        strokeThickness: 4,
      }).setDepth(10);
    }

    function addShooterColorText() {
      if (shooterColorText) shooterColorText.destroy();
      shooterColorText = this.add.text(300, 625, "Pink", {
        fontSize: "22px",
        fontFamily: "'Arial Black', sans-serif",
        fill: "#fff",
        stroke: "#000",
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(4);
    }

    function createControls() {
      // Exit button
      const exitBtn = this.add.text(750, 30, "✕", {
        fontSize: "32px",
        color: "#FF0000",
        backgroundColor: "#333333",
        padding: { x: 15, y: 5 },
        stroke: "#000000",
        strokeThickness: 2,
      }).setInteractive({ useHandCursor: true });

      exitBtn.on("pointerdown", () => {
        onExit();
      });

      // Instructions button
      const infoBtn = this.add.text(700, 30, "ℹ️", {
        fontSize: "28px",
        color: "#FFFFFF",
        backgroundColor: "#333333",
        padding: { x: 15, y: 5 },
        stroke: "#000000",
        strokeThickness: 2,
      }).setInteractive({ useHandCursor: true });

      infoBtn.on("pointerdown", () => {
        showInstructions.call(this);
      });
    }

    function createInstructions() {
      const panelBg = this.add.graphics()
        .fillStyle(0x111111, 1)
        .fillRoundedRect(100, 50, 600, 600, 16)
        .lineStyle(3, 0x4a90e2, 1)
        .strokeRoundedRect(100, 50, 600, 600, 16);

      const title = this.add.text(400, 100, "HOW TO PLAY", {
        fontSize: "32px",
        fontFamily: "Arial Black",
        color: "#4a90e2",
        stroke: "#000",
        strokeThickness: 3,
      }).setOrigin(0.5);

      const instructions = this.add.text(400, 350, `1) Selecting a Potion Color:  
- Thumb + Index Finger: Green potion  
- Thumb + Middle Finger: Yellow potion  
- Thumb + Ring Finger: Pink potion  
- Thumb + Little Finger: Blue potion  

2) Aiming: Rotate your wrist  
3) Shooting: Flex fingers inward`, {
        fontSize: "16px",
        fontFamily: "Arial",
        color: "#ffffff",
        align: "center",
        lineSpacing: 6,
        wordWrap: { width: 550 },
      }).setOrigin(0.5);

      const closeBtn = this.add.text(400, 600, "GOT IT", {
        fontSize: "24px",
        fontFamily: "Arial Black",
        color: "#ffffff",
        backgroundColor: "#4a90e2",
        padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setInteractive();

      closeBtn.on("pointerdown", () => {
        hideInstructions.call(this);
      });

      instructionElements = [panelBg, title, instructions, closeBtn];
    }

    function hideInstructions() {
      instructionElements.forEach(el => el.destroy());
      shouldShowInstructions = false;
      this.physics.resume();
    }

    function showInstructions() {
      createInstructions.call(this);
      shouldShowInstructions = true;
      this.physics.pause();
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
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      width: "100%",
      backgroundColor: "#333",
    }}>
      <div ref={gameContainer} style={{ position: "relative" }} />
    </div>
  );
};

export default PotionBlast;