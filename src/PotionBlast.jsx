import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

const PotionBlast = ({ onExit }) => {
  const gameContainer = useRef(null);
  const gameInstance = useRef(null);
  const [ws, setWs] = useState(null);
  // Flex sensor thresholds (adjust based on your glove)
  const FLEX_THRESHOLD = 2500; // Value when fingers are flexed
  const TOUCH_THRESHOLD = 30; // Lower = more sensitive touch detection

  // Accelerometer sensitivity
  const ACCEL_SENSITIVITY = 5;

  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket("ws://localhost:8080");

      socket.onopen = () => {
        console.log("Connected to bridge");
        setWs(socket);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          processSensorData(data);
        } catch (err) {
          console.error("Data parsing error:", err);
        }
      };

      socket.onclose = () => {
        console.log("Reconnecting in 2 seconds...");
        setTimeout(connect, 2000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      console.log("Connected to WebSocket bridge");
    };

    ws.onmessage = (event) => {
      const sensorData = JSON.parse(event.data);
      // Process sensor data here (see next steps)
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
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

    // Game variables
    const bubbleSize = 35;
    const speed = 600;
    const colors = ["pink", "green", "blue", "yellow"];
    const colorNames = ["Pink", "Green", "Blue", "Yellow"];
    const rows = 7;
    const cols = 15;
    let score = 0;
    let gameOver = false;
    let gameWon = false;
    let bubbles;
    let shooter;
    let shooterColor;
    let angle = 0;
    let dottedLine;
    let scoreText;
    let shooterColorText;
    let cheerMessage;
    let shooterBase;
    let instructionsButton;
    let instructionsText;
    let closeButton;
    let shouldShowInstructions = true;
    let instructionElements = [];

    // Phaser scene functions
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
      this.physics.world.setBounds(0, 0, 600, 600);
      bubbles = this.physics.add.group();
      angle = 0;

      createBottomPanel.call(this);
      createShooter.call(this);
      addScoreText.call(this);
      createBubbles.call(this);
      // setupControls.call(this);
      createControls.call(this);
      createInstructions.call(this);

      this.time.addEvent({
        delay: 15000,
        callback: addNewRow,
        callbackScope: this,
        loop: true,
      });

      dottedLine = this.add.graphics();
    }

    function update() {
      if (shouldShowInstructions) {
        this.physics.pause();
      } else {
        this.physics.resume();
      }
    }

    function createInstructions() {
      const panelWidth = 600;
      const panelHeight = 600;
      const panelX = 100;
      const panelY = 50;

      // Panel background with no transparency and highest depth
      const panelBg = this.add.graphics();
      panelBg.fillStyle(0x111111, 1); // Fully opaque black
      panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
      panelBg.lineStyle(3, 0x4a90e2, 1); // Blue border
      panelBg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
      panelBg.setDepth(100); // Ensure it is on top
      instructionElements.push(panelBg);

      // Instructions title
      const title = this.add
        .text(400, 100, "HOW TO PLAY", {
          fontSize: "32px",
          fontFamily: "Arial Black",
          color: "#4a90e2",
          stroke: "#000",
          strokeThickness: 3,
          shadow: {
            offsetX: 2,
            offsetY: 2,
            color: "#000",
            blur: 3,
            stroke: true,
          },
        })
        .setOrigin(0.5)
        .setDepth(101); // On top of background
      instructionElements.push(title);

      // Instructions text with improved formatting
      instructionsText = this.add
        .text(
          400,
          350,
          `1) Selecting a Potion Color:  
      - Thumb + Index Finger: Selects the Green potion.  
      - Thumb + Middle Finger: Selects the Yellow potion.  
      - Thumb + Ring Finger: Selects the Pink potion.  
      - Thumb + Little Finger: Selects the Blue potion.  
      The wand changes to the selected color for confirmation.
    
    2) Aiming the Wand:  
      Rotate your wrist to aim the wand on the screen.
    
    3) Shooting the Potion Bottle:  
      Perform a finger flexion movement (fold fingers inward) to cast a spell.
    
    🪄 Clear all bubbles before they reach the bottom to win!`,
          {
            fontSize: "16px",
            fontFamily: "Arial",
            color: "#ffffff",
            align: "left",
            lineSpacing: 6,
            wordWrap: { width: 550 },
            stroke: "#000",
            strokeThickness: 2,
          }
        )
        .setOrigin(0.5)
        .setDepth(101); // On top of background
      instructionElements.push(instructionsText);

      // "GOT IT" button
      const buttonWidth = 160;
      const buttonHeight = 50;
      const buttonColor = 0x4a90e2;
      const buttonX = 400 - buttonWidth / 2;
      const buttonY = 600 - buttonHeight / 2;

      // Button background
      const closeButtonBg = this.add.graphics();
      closeButtonBg.fillStyle(buttonColor, 1);
      closeButtonBg.fillRoundedRect(
        buttonX,
        buttonY,
        buttonWidth,
        buttonHeight,
        10
      );
      closeButtonBg.setDepth(102); // Ensure button is above text
      instructionElements.push(closeButtonBg);

      // Button text
      closeButton = this.add
        .text(400, 600, "GOT IT", {
          fontSize: "24px",
          fontFamily: "Arial Black",
          color: "#ffffff",
          stroke: "#000",
          strokeThickness: 2,
          shadow: {
            offsetX: 2,
            offsetY: 2,
            color: "#000",
            blur: 3,
            stroke: true,
          },
        })
        .setOrigin(0.5)
        .setDepth(103) // Ensure button text is on top
        .setInteractive({ useHandCursor: true });

      // Button hover effects
      closeButton.on("pointerover", () => {
        closeButton.setScale(1.1);
        closeButtonBg
          .clear()
          .fillStyle(0xffeb3b, 1)
          .fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      });

      closeButton.on("pointerout", () => {
        closeButton.setScale(1);
        closeButtonBg
          .clear()
          .fillStyle(buttonColor, 1)
          .fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      });

      closeButton.on("pointerdown", () => {
        hideInstructions.call(this);
      });

      instructionElements.push(closeButton);

      // Force all elements to the front
      instructionElements.forEach((el) => el.setDepth(105).setVisible(true));
    }

    function hideInstructions() {
      instructionElements.forEach((el) => el.setVisible(false));
      shouldShowInstructions = false;
      this.physics.resume();
      this.scene.resume();
    }

    function showInstructions() {
      instructionElements.forEach((el) => el.setVisible(true));
      shouldShowInstructions = true;
      this.physics.pause();
      this.scene.pause();
    }

    function createControls() {
      // Exit button
      closeButton = this.add
        .text(750, 30, "✕", {
          fontSize: "32px",
          color: "#FF0000",
          backgroundColor: "#333333",
          padding: { x: 15, y: 5 },
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setDepth(100)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0);

      closeButton.on("pointerdown", () => {
        onExit();
      });

      // Instructions button
      instructionsButton = this.add
        .text(700, 30, "ℹ️", {
          fontSize: "28px",
          color: "#FFFFFF",
          backgroundColor: "#333333",
          padding: { x: 15, y: 5 },
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setDepth(100)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0);

      instructionsButton.on("pointerdown", () => {
        showInstructions.call(this);
      });
    }
    // Game helper functions
    function createBottomPanel() {
      this.add
        .image(100, 600, "left_image")
        .setScale(0.5)
        .setOrigin(0.5)
        .setInteractive();

      this.add
        .image(500, 600, "right_image")
        .setScale(0.5)
        .setOrigin(0.5)
        .setInteractive();
    }

    function createShooter() {
      shooterBase = this.add.rectangle(300, 580, 100, 10, 0xffffff);
      shooter = this.add.sprite(300, 550, "pink_star").setScale(0.6);
      shooterColor = "pink";
      addShooterColorText.call(this);
    }

    function createBubbles() {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let x = c * bubbleSize * 1.1 + bubbleSize / 2;
          let y = r * bubbleSize * 1.1 + 70;
          let colorKey = Phaser.Utils.Array.GetRandom(colors);
          let bubble = bubbles.create(x, y, colorKey).setScale(0.6);
          bubble.color = colorKey;
          bubble.body.setImmovable(true);
        }
      }
    }

    // Add these inside your component
    const processSensorData = (sensorData) => {
      const { flex, touch, accel } = sensorData;

      // 1. Handle potion color selection (thumb + finger touches)
      if (touch[4] < 30) {
        // Thumb (TOUCH_S5) pressed
        if (touch[0] < 30) changeShooterColor(1); // Green (Index)
        else if (touch[1] < 30) changeShooterColor(3); // Yellow (Middle)
        else if (touch[2] < 30) changeShooterColor(0); // Pink (Ring)
        else if (touch[3] < 30) changeShooterColor(2); // Blue (Little)
      }

      // 2. Handle shooting (finger flexion)
      const avgFlex = (flex[0] + flex[1] + flex[2] + flex[3]) / 4;
      if (avgFlex > 2500) {
        // Adjust threshold based on your flex sensors
        const strength = Phaser.Math.Clamp(avgFlex / 3000, 0.5, 1.5);
        shootBubble(strength);
      }

      // 3. Handle aiming (accelerometer)
      const angleChange = accel[0] * 5; // X-axis rotation
      changeAngle(angleChange);
    };

    // Update your WebSocket onmessage handler:
    ws.onmessage = (event) => {
      const sensorData = JSON.parse(event.data);
      processSensorData(sensorData);
    };
    // function setupControls() {
    //   this.input.keyboard.on("keydown-SPACE", () => {
    //     dottedLine.clear();
    //     shootBubble.call(this);
    //   });

    //   this.input.keyboard.on("keydown-LEFT", () => {
    //     changeAngle.call(this, -5);
    //     drawDottedLine.call(this);
    //   });

    //   this.input.keyboard.on("keydown-RIGHT", () => {
    //     changeAngle.call(this, 5);
    //     drawDottedLine.call(this);
    //   });

    //   this.input.keyboard.on("keydown-ONE", () => {
    //     changeShooterColor.call(this, 0);
    //     drawDottedLine.call(this);
    //   });
    //   this.input.keyboard.on("keydown-TWO", () => {
    //     changeShooterColor.call(this, 1);
    //     drawDottedLine.call(this);
    //   });
    //   this.input.keyboard.on("keydown-THREE", () => {
    //     changeShooterColor.call(this, 2);
    //     drawDottedLine.call(this);
    //   });
    //   this.input.keyboard.on("keydown-FOUR", () => {
    //     changeShooterColor.call(this, 3);
    //     drawDottedLine.call(this);
    //   });

    //   this.input.keyboard.on("keydown-UP", () => {
    //     dottedLine.clear();
    //     shootBubble.call(this, 1.5);
    //   });

    //   this.input.keyboard.on("keydown-DOWN", () => {
    //     dottedLine.clear();
    //     shootBubble.call(this, 0.7);
    //   });

    //   // Add exit game control (ESC key)
    //   this.input.keyboard.on("keydown-ESC", () => {
    //     onExit();
    //   });
    // }

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
      if (index >= 0 && index < colors.length) {
        shooterColor = colors[index];
        shooter.setTexture(shooterColor + "_star");
        shooterColorText.setText(colorNames[index]);
      }
    }

    function showCheerMessage() {
      if (cheerMessage) {
        cheerMessage.destroy();
      }

      cheerMessage = this.add.text(
        Phaser.Math.Between(200, 400),
        Phaser.Math.Between(200, 400),
        Phaser.Utils.Array.GetRandom(["Nice!", "Great!", "Awesome!", "Boom!"]),
        {
          fontSize: "32px",
          fill: "#ffff00",
          fontStyle: "bold",
          stroke: "#000",
          strokeThickness: 4,
        }
      );

      this.time.delayedCall(1000, () => {
        if (cheerMessage) {
          cheerMessage.destroy();
          cheerMessage = null;
        }
      });
    }

    function shootBubble(impactStrength = 1.0) {
      if (gameOver || gameWon) return;
      dottedLine.clear();

      const normalizedImpact = Phaser.Math.Clamp(impactStrength, 0.5, 1.5);
      const isStrongImpact = impactStrength > 1.2;

      let radianAngle = Phaser.Math.DegToRad(angle - 90);

      let star = this.physics.add
        .sprite(shooter.x, shooter.y, shooterColor + "_star")
        .setScale(0.6);

      star.color = shooterColor;
      star.impactStrength = normalizedImpact;
      star.isStrongImpact = isStrongImpact;
      star.setVelocity(
        speed * Math.cos(radianAngle),
        speed * Math.sin(radianAngle)
      );

      star.body.setCollideWorldBounds(true, true, true, false);
      star.body.onWorldBounds = true;

      this.physics.world.on("worldbounds", (body) => {
        if (body.gameObject === star) {
          if (body.blocked.left || body.blocked.right || body.blocked.up) {
            star.destroy();
          }
        }
      });

      this.physics.add.collider(star, bubbles, (shotStar, targetBottle) => {
        if (!shotStar.active) return;

        shotStar.disableBody(true, true);

        if (shotStar.color === targetBottle.color) {
          if (shotStar.isStrongImpact) {
            showCheerMessage.call(this);
          }

          const burstRadius = shotStar.impactStrength * 100;

          const bubblesToBurst = bubbles
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

          score += bubblesToBurst.length * 2;
          scoreText.setText("Score: " + score);

          checkWinCondition.call(this);
        }
      });
    }

    function addNewRow() {
      if (gameOver || gameWon) return;

      bubbles.getChildren().forEach((bubble) => {
        if (bubble.active) {
          bubble.y += bubbleSize * 1.1;
          if (bubble.y >= 550) {
            gameOver = true;
            this.add.text(200, 300, "Game Over", {
              fontSize: "32px",
              fill: "#fff",
            });
          }
        }
      });

      for (let c = 0; c < cols; c++) {
        let x = c * bubbleSize * 1.1 + bubbleSize / 2;
        let y = 70;
        let colorKey = Phaser.Utils.Array.GetRandom(colors);
        let bubble = bubbles.create(x, y, colorKey).setScale(0.6);
        bubble.color = colorKey;
        bubble.body.setImmovable(true);
      }
    }

    function changeAngle(delta) {
      angle = Phaser.Math.Clamp(angle + delta, -90, 90);
      let radianAngle = Phaser.Math.DegToRad(angle);
      shooterBase.rotation = radianAngle;
      drawDottedLine.call(this);
    }

    function addScoreText() {
      scoreText = this.add
        .text(10, 10, "Score: 0", {
          fontSize: "20px",
          fontFamily: "'Arial Black', sans-serif",
          fill: "#fff",
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setDepth(10);
    }

    function addShooterColorText() {
      if (shooterColorText) {
        shooterColorText.destroy();
      }

      shooterColorText = this.add
        .text(300, 625, "Pink", {
          fontSize: "22px",
          ontFamily: "'Arial Black', sans-serif",
          fill: "#fff",
          fontStyle: "bold",
          stroke: "#000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(4);
    }

    function checkWinCondition() {
      const activeBubbles = bubbles
        .getChildren()
        .filter((b) => b.active).length;

      if (activeBubbles === 0 && !gameOver) {
        gameWon = true;
        this.add.text(200, 300, "You Won!", {
          fontSize: "48px",
          fill: "#0f0",
          fontStyle: "bold",
        });

        this.input.keyboard.off("keydown-SPACE");
        this.input.keyboard.off("keydown-LEFT");
        this.input.keyboard.off("keydown-RIGHT");
      }
    }

    // Initialize the game
    gameInstance.current = new Phaser.Game(config);

    // Cleanup function
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
        overflow: "hidden",
      }}
    >
      <div ref={gameContainer} style={{ position: "relative" }} />
    </div>
  );
};

export default PotionBlast;
