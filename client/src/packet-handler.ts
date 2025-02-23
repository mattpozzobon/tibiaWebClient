import { PropBitFlag } from "./bitflag";
import Book from "./book";
import ConditionManager from "./condition";
import Container from "./container";
import Creature from "./creature";
import FluidThing from "./fluid-container";
import GameClient from "./gameclient";
import { CONST } from "./helper/appContext";
import Interface from "./interface";
import Item from "./item";
import Position from "./position";
import Thing from "./thing";
import Tile from "./tile";
import BattleWindow from "./window-battle";

class PacketHandler {
  gameClient: GameClient;

  constructor(gameClient: GameClient) {
    /*
     * Class PacketHandler
     * Containers handler functions for all incoming network packets from the gameserver
     * This usually delegates to the gameClient but is a central place for collections
     */
    this.gameClient = gameClient;
  }

  handlePropertyChange(packet: { guid: number; property: number; value: number }): void {
    let creature = this.gameClient.world.getCreature(packet.guid);
    if (!creature) return;

    console.log(`player property: ${packet.property}, value: ${packet.value}`);

    switch (packet.property) {
      case CONST.PROPERTIES.HEALTH:
        creature.state.health = packet.value;
        break;
      case CONST.PROPERTIES.HEALTH_MAX:
        creature.maxHealth = packet.value;
        break;
      case CONST.PROPERTIES.MANA:
        creature.state.mana = packet.value;
        break;
      case CONST.PROPERTIES.ENERGY:
        creature.state.energy = packet.value;
        break;
      case CONST.PROPERTIES.DIRECTION:
        creature.__setLookDirection(packet.value);
        break;
      case CONST.PROPERTIES.CAPACITY:
        creature.state.capacity = packet.value;
        break;
    }
  }

  handleWorldTime(time: number): void {
    this.gameClient.world.clock.setPhase(time);
  }

  handleSetTarget(id: number): void {
    if (id === 0) {
      this.gameClient.player!.setTarget(null);
      return;
    }

    let creature = this.gameClient.world.getCreature(id);
    if (!creature) return;

    this.gameClient.player!.setTarget(creature);
  }

  handleCombatLock(bool: boolean): void {
    const condition = {
      toggle: bool,
      guid: this.gameClient.player!.id,
      cid: ConditionManager.COMBAT_LOCK,
    };
    this.handleCondition(condition);
  }

  handleCondition(packet: { guid: number; toggle: boolean; cid: number }): void {
    let creature = this.gameClient.world.getCreature(packet.guid);
    if (!creature) return;

    if (packet.toggle) {
      creature.addCondition(packet.cid);
    } else {
      creature.removeCondition(packet.cid);
    }
  }

  handleTradeOffer(packet: any): void {
    this.gameClient.interface.modalManager.open("offer-modal", packet);
  }

  handlePlayerStatistics(packet: {
    capacity: number;
    attack: number;
    armor: number;
    speed: number;
  }): void {
    if (!this.gameClient.player) return;

    this.gameClient.player.state.capacity = packet.capacity;
    this.gameClient.player.state.attack = packet.attack;
    this.gameClient.player.state.armor = packet.armor;
    this.gameClient.player.state.speed = packet.speed;
  }

  handleOpenChannel(packet: any): void {
    this.gameClient.interface.channelManager.handleOpenChannel(packet);
  }

  handleAddAchievement(packet: { title: string; description: string }): void {
    setTimeout(() => {
      document.getElementById("achievement")!.innerHTML = `${packet.title}<hr>${packet.description}`;
      document.getElementById("achievement")!.className = "canvas-notification visible";
    }, 1000);

    setTimeout(() => {
      document.getElementById("achievement")!.className = "canvas-notification hidden";
    }, 2000);
  }

  handleSendDistanceEffect(packet: any): void {
    this.gameClient.renderer.addDistanceAnimation(packet);
  }

  handleSendMagicEffect(packet: any): void {
    this.gameClient.renderer.addPositionAnimation(packet);
  }

  handleTransformTile(packet: any): void {
    this.gameClient.world.handleTransformTile(packet);
  }

  handleAcceptLogin(packet: any): void {
    this.gameClient.handleAcceptLogin(packet);
  }

  handleRemoveFriend(name: string): void {
    this.gameClient.player!.friendlist.remove(name);
  }

  handleAddFriend(name: string): void {
    this.gameClient.player!.friendlist.add({name: name, online: true});
  }

  handleCancelMessage(packet: any): void {
    this.gameClient.interface.notificationManager.setCancelMessage(packet);
  }

  handleServerData(packet: any): void {
    this.gameClient.setServerData(packet);
  }

  handleEmote(packet: { id: number; message: string; color: number }): void {
    let sourceCreature = this.gameClient.world.getCreature(packet.id);
    if (!sourceCreature) return;

    this.gameClient.interface.screenElementManager.createFloatingTextElement(
      `<i>${packet.message}</i>`,
      sourceCreature.getPosition(),
      packet.color
    );
  }

  handleIncreaseHealth(packet: { id: number; amount: number }): void {
    let sourceCreature = this.gameClient.world.getCreature(packet.id);
    if (!sourceCreature) return;

    let health = Math.min(packet.amount, sourceCreature.maxHealth - sourceCreature.state.health);
    if (health === 0) return;

    sourceCreature.increaseHealth(health);

    this.gameClient.interface.screenElementManager.createFloatingTextElement(
      health.toString(),
      sourceCreature.getPosition(),
      Interface.COLORS.LIGHTGREEN
    );

    if (this.gameClient.player === sourceCreature) {
      this.gameClient.interface.channelManager.addConsoleMessage(
        `You heal for ${health} health.`,
        Interface.COLORS.WHITE
      );
    }
  }

  handleEnterZone(packet: {
    name: string;
    title: string;
    weather: number;
    ambient: { r: number; g: number; b: number; a: number };
    music: string;
  }): void {
    this.gameClient.interface.notificationManager.setZoneMessage(packet.name, packet.title);
    this.gameClient.renderer.weatherCanvas.setWeather(packet.weather);
    this.gameClient.renderer.setAmbientColor(packet.ambient.r, packet.ambient.g, packet.ambient.b, packet.ambient.a);
    this.gameClient.interface.soundManager.setAmbientTrace(packet.music);
  }

  handleLatency(): void {
    this.gameClient.networkManager.state.latency = performance.now() - this.gameClient.networkManager.__latency;
  }

  handleChunk(chunk: { id: number }): void {
    if (this.gameClient.world.chunks.some((c) => c.id === chunk.id)) return;

    this.gameClient.world.chunks.push(chunk);
    this.gameClient.world.chunks.sort((a, b) => a.id - b.id);
    this.gameClient.world.referenceTileNeighbours();
  }

  handleRemoveItem(packet: { position: any; index: number; count: number }): void {
    let tile = this.gameClient.world.getTileFromWorldPosition(packet.position);
    if (!tile) return;

    tile.removeItem(packet.index, packet.count);
  }

  handleAdvanceLevel(): void {
    //TODO: 
    //this.gameClient.player!.advanceLevel();
  }

  handleServerError(message: string): void {
    this.gameClient.interface.modalManager.open("floater-connecting", message);
  }

  handleServerMessage(string: string): void {
    this.gameClient.interface.notificationManager.setServerMessage(string, Interface.COLORS.RED);
  }

  
  getTileUppie(position: Position): Tile | null {
    let tile = this.gameClient.world.getTileFromWorldPosition(position);

    if (!tile.isOccupied()) {
      return tile;
    }

    if (tile.id === 0) {
      return this.gameClient.world.getTileFromWorldPosition(position.down());
    }

    if (this.gameClient.player!.getTile().hasMaximumElevation()) {
      return this.gameClient.world.getTileFromWorldPosition(position.up());
    }

    return tile;
  }

  clientSideMoveCheck(position: Position): boolean {
    let tile = this.gameClient.world.getTileFromWorldPosition(position);

    if (tile.monsters.size > 0) {
      return true;
    }

    if (tile.id === 0) {
      if (this.gameClient.player!.__position.isDiagonal(position)) {
        return true;
      }

      let belowTile = this.gameClient.world.getTileFromWorldPosition(position.down());

      if (belowTile && belowTile.hasMaximumElevation() && !belowTile.isOccupied()) {
        return false;
      }
    }

    if (this.gameClient.player!.getTile().hasMaximumElevation()) {
      if (this.gameClient.player!.__position.isDiagonal(position)) {
        return true;
      }

      let upTile = this.gameClient.world.getTileFromWorldPosition(position.up());
      let aboveTile = this.gameClient.world.getTileFromWorldPosition(this.gameClient.player!.__position.up());

      if ((!aboveTile || aboveTile.id === 0) && upTile && !upTile.isOccupied()) {
        return false;
      }
    }

    return tile.isOccupied();
  }

  handlePlayerMove(position: Position): boolean {
    if (this.clientSideMoveCheck(position)) {
      this.gameClient.interface.setCancelMessage("You cannot walk here.");
      return false;
    }

    let tile = this.getTileUppie(position);
    let duration = this.gameClient.player!.getStepDuration(tile);
    this.gameClient.world.handleCreatureMove(this.gameClient.player!.id, position, duration);
    return true;
  }

  handleDamageEvent(packet: { source: number; target: number; damage: number; color: number }): void {
    let sourceCreature = this.gameClient.world.getCreature(packet.source);
    let targetCreature = this.gameClient.world.getCreature(packet.target);

    if (packet.source === 0 && targetCreature) {
      this.__handleDamageEnvironment(targetCreature, packet.damage, packet.color);
      return;
    }

    if (!sourceCreature || !targetCreature) {
      return;
    }

    targetCreature.addAnimation(1);

    if (targetCreature === this.gameClient.player && sourceCreature !== this.gameClient.player) {
      sourceCreature.addBoxAnimation(Interface.COLORS.BLACK);
    }

    targetCreature.increaseHealth(-packet.damage);

    if (this.gameClient.player === targetCreature) {
      this.gameClient.interface.channelManager.addConsoleMessage(
        `You lose ${packet.damage} health to a ${sourceCreature.name}.`,
        Interface.COLORS.WHITE
      );
    } else if (this.gameClient.player === sourceCreature) {
      this.gameClient.interface.channelManager.addConsoleMessage(
        `You deal ${packet.damage} damage to a ${targetCreature.name}.`,
        Interface.COLORS.WHITE
      );
    }

    this.gameClient.interface.screenElementManager.createFloatingTextElement(
      packet.damage.toString(),
      targetCreature.getPosition(),
      packet.color
    );
  }

  handleChangeOutfit(packet: { id: number; outfit: any }): void {
    let creature = this.gameClient.world.getCreature(packet.id);
    if (!creature) return;
    creature.serverSetOutfit(packet.outfit);
  }

  getLiquidText(liquidType: number): string | null {
    switch (liquidType) {
      case 0:
        return null;
      case 1:
      case 9:
        return "water";
      case 2:
        return "blood";
      case 3:
        return "beer";
      case 4:
      case 12:
        return "slime";
      case 5:
        return "lemonade";
      case 6:
        return "milk";
      case 7:
        return "mana fluid";
      case 10:
        return "health fluid";
      case 11:
        return "oil";
      case 13:
        return "urine";
      case 14:
        return "coconut milk";
      case 15:
        return "wine";
      case 19:
        return "mud";
      case 21:
        return "fruit juice";
      case 26:
        return "lava";
      case 27:
        return "rum";
      default:
        return "unknown substance";
    }
  }

  handleLiquidMessage(packet: { count: number; name: string; article: string }): string {
    let liquid = this.getLiquidText(packet.count);
    if (liquid === null) {
      return `You see an empty ${packet.name}.`;
    }
    return `You see ${packet.article} ${packet.name} of ${liquid}.`;
  }

  getItemDescription(packet: { cid: number; count: number; name: string; article: string }): string {
    let thing = new Item(this.gameClient, packet.cid, packet.count);

    if (thing.isFluidContainer() || thing.isSplash()) {
      return this.handleLiquidMessage(packet);
    }

    if (packet.count === 0 || packet.count === 1) {
      return `You see ${packet.article} ${packet.name}.`;
    }

    if (packet.name.endsWith("s")) {
      return `You see ${packet.count} ${packet.name}es.`;
    } else {
      return `You see ${packet.count} ${packet.name}s.`;
    }
  }

  
  handleCharacterInformation(packet: { name: string; level: number; gender: number }): void {
    const gender = packet.gender === 0 ? "He" : "She";
    const message = `You see ${packet.name}. ${gender} is level ${packet.level}.`;

    this.gameClient.interface.notificationManager.setServerMessage(message, Interface.COLORS.LIGHTGREEN);
    this.gameClient.interface.channelManager.addConsoleMessage(message, Interface.COLORS.LIGHTGREEN);
  }

  handleItemInformation(packet: any): void {
    let message = this.getItemDescription(packet);
    let thing = new Thing(this.gameClient, packet.cid);

    if (packet.description) {
      message += ` ${packet.description}`;
    }

    if (packet.distanceReadable) {
      message += ` ${packet.distanceReadable}`;
    }

    if (packet.weight) {
      const weightText = (1e-2 * packet.weight).toFixed(2);
      if (thing.isStackable() && packet.count > 1) {
        message += ` They weigh ${weightText}oz.`;
      } else {
        message += ` It weighs ${weightText}oz.`;
      }
    }

    if (packet.armor !== 0) {
      message += ` (Armor: ${packet.armor})`;
    }

    if (packet.attack !== 0) {
      message += ` (Attack: ${packet.attack})`;
    }

    if (this.gameClient.renderer.debugger.isActive()) {
      message += ` (SID: ${packet.sid}, CID: ${packet.cid})`;
    }

    if (packet.x && packet.y) {
      message += ` (X: ${packet.x}, Y: ${packet.y}, Z: ${packet.z})`;
    }

    this.gameClient.interface.notificationManager.setServerMessage(message, Interface.COLORS.LIGHTGREEN);
    this.gameClient.interface.channelManager.addConsoleMessage(message, Interface.COLORS.LIGHTGREEN);
  }

  handleEntityRemove(id: number): void {
    let creature = this.gameClient.world.getCreature(id);
    if (!creature || this.gameClient.isSelf(creature)) return;

    let tile = this.gameClient.world.getTileFromWorldPosition(creature.getPosition());
    if (!tile) return;

    tile.monsters.delete(creature);
    if (this.gameClient.player!.__target === creature) {
      this.gameClient.player!.setTarget(null);
    }

    creature.remove();
    delete this.gameClient.world.activeCreatures[id];
    (this.gameClient.interface.windowManager.getWindow("battle-window") as BattleWindow).removeCreature(id);
  }

  handleContainerItemRemove(packet: { containerIndex: number; slotIndex: number; count: number }): void {
    let container = this.gameClient.player!.getContainer(packet.containerIndex);
    if (!container) return;
    container.removeItem(packet.slotIndex, packet.count);
  }

  handleContainerAddItem(packet: { containerId: number; itemId: number; count: number; slot: number }): void {
    let container = this.gameClient.player!.getContainer(packet.containerId);
    if (!container) return;
    container.addItem(new Item(this.gameClient, packet.itemId, packet.count), packet.slot);
  }

  handleContainerOpen(packet: any): void {
    let container = new Container(this.gameClient, packet);
    container.createDOM(packet.equipped ? `${packet.title}[E]` : packet.title, packet.items);
    this.gameClient.interface.windowManager.register(container.window);
    this.gameClient.player!.openContainer(container);
  }

  handleContainerClose(id: number): void {
    let container = this.gameClient.player!.getContainer(id);
    if (!container) return;
    this.gameClient.player!.removeContainer(container);
  }

  handlePlayerDisconnect(name: string): void {
    this.gameClient.player!.friendlist.setOnlineStatus(name, false);
  }

  handlePlayerConnect(name: string): void {
    this.gameClient.player!.friendlist.setOnlineStatus(name, true);
  }

  handleCreatureServerMove(packet: { id: number; position: Position; speed: number }): void {
    let entity = this.gameClient.world.getCreature(packet.id);
    if (!entity) return;

    console.log("__handleCreatureMove", packet.speed);
    this.gameClient.world.__handleCreatureMove(packet.id, packet.position, packet.speed);

    if (this.gameClient.isSelf(entity)) {
      this.gameClient.player!.confirmClientWalk();
      this.gameClient.world.checkEntityReferences();
      this.gameClient.world.checkChunks();
    }
  }

  handleReadText(packet: any): void {
    this.gameClient.interface.modalManager.open("readable-modal", packet);
  }

  handleChannelMessage(packet: { id: number; message: string; name: string; color: number }): void {
    let channel = this.gameClient.interface.channelManager.getChannelById(packet.id);
    if (!channel) return;
    channel.addMessage(packet.message, 0, packet.name, packet.color);
  }

  handleDefaultMessage(packet: { id: number }): void {
    let entity = this.gameClient.world.getCreature(packet.id);
    if (!entity || !this.gameClient.player!.canSeeSmall(entity)) return;
    entity.say(packet);
  }

  handleEntityTeleport(packet: { id: number; position: Position }): void {
    let entity = this.gameClient.world.getCreature(packet.id);
    if (!entity) return;

    entity.setPosition(packet.position);
    if (this.gameClient.isSelf(entity)) {
      this.gameClient.world.handleSelfTeleport();
    }
  }

  handleEntityReference(packet: any): void {
    if (this.gameClient.player && packet.id === this.gameClient.player.id) {
      return this.gameClient.world.addCreature(this.gameClient.player);
    }
    console.log("handleEntityReference: ", packet);
    this.gameClient.world.createCreature(packet.id, new Creature(this.gameClient, packet));
  }

  handleCreatureTurn(packet: { id: number; direction: number }): void {
    let creature = this.gameClient.world.getCreature(packet.id);
    if (!creature) return;
    creature.setTurnBuffer(packet.direction);
  }

  handleReceivePrivateMessage(packet: { message: string; name: string }): void {
    let channel = this.gameClient.interface.channelManager.getChannel(packet.name);
    if (!channel) {
      channel = this.gameClient.interface.channelManager.getChannel("Default");
    }
    channel!.addPrivateMessage(packet.message, packet.name);
  }

  handleGainExperience(packet: { id: number; experience: number }): void {
    let creature = this.gameClient.world.getCreature(packet.id);
    if (!creature) {
      return console.error("Received experience gain for unknown creature.");
    }

    this.gameClient.interface.screenElementManager.createFloatingTextElement(
      packet.experience.toString(),
      creature.getPosition(),
      Interface.COLORS.WHITE
    );

    if (this.gameClient.player !== creature) return;

    this.gameClient.interface.channelManager.addConsoleMessage(
      `You gain ${packet.experience} experience.`,
      Interface.COLORS.WHITE
    );

    creature.addExperience(packet.experience);
  }

  handleItemAdd(packet: { id: number; count: number; position: Position; slot: number }): void {
    let thing = new Thing(this.gameClient, packet.id);

    if (thing.hasFlag("DatFlagWritableOnce") || thing.hasFlag("DatFlagWritable")) {
      return this.gameClient.world.addItem(packet.position, new Book(this.gameClient, packet.id), packet.slot);
    }

    if (thing.isFluidContainer() || thing.isSplash()) {
      return this.gameClient.world.addItem(packet.position, new FluidThing(this.gameClient, packet.id, packet.count), packet.slot);
    }

    this.gameClient.world.addItem(packet.position, new Item(this.gameClient, packet.id, packet.count), packet.slot);
  }

  private __handleDamageEnvironment(targetCreature: Creature, damage: number, color: number): void {
    this.gameClient.interface.screenElementManager.createFloatingTextElement(
      damage.toString(),
      targetCreature.getPosition(),
      color
    );

    this.gameClient.interface.channelManager.addConsoleMessage(
      `You lose ${damage} health.`,
      Interface.COLORS.WHITE
    );

    targetCreature.increaseHealth(-damage);
  }

}

export default PacketHandler;







