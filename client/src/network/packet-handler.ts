import Chunk from "../core/chunk";
import Book from "../game/book";
import ConditionManager from "../game/condition";
import Container from "../game/container";
import Creature from "../game/creature";
import FluidThing from "../game/fluid-container";
import Item from "../game/item";
import Position from "../game/position";
import Thing from "../game/thing";
import Tile from "../game/tile";
import { CONST } from "../helper/appContext";
import Interface from "../ui/interface";
import BattleWindow from "../ui/window/window-battle";


class PacketHandler {
  constructor() {
    /*
     * Class PacketHandler
     * Containers handler functions for all incoming network packets from the gameserver
     * This usually delegates to the gameClient but is a central place for collections
     */
    
  }

  handlePropertyChange(packet: { guid: number; property: number; value: number }): void {
    let creature = window.gameClient.world.getCreature(packet.guid);
    if (!creature) return;

    console.log(`player property: ${packet.property}, value: ${packet.value}`);

    switch (packet.property) {
      case CONST.PROPERTIES.HEALTH:
        creature.vitals.state.health = packet.value;
        break;
      case CONST.PROPERTIES.HEALTH_MAX:
        creature.vitals.state.maxHealth = packet.value;
        break;
      case CONST.PROPERTIES.MANA:
        creature.vitals.state.mana = packet.value;
        break;
      case CONST.PROPERTIES.ENERGY:
        creature.vitals.state.energy = packet.value;
        break;
      case CONST.PROPERTIES.DIRECTION:
        creature.__setLookDirection(packet.value);
        break;
      case CONST.PROPERTIES.CAPACITY:
        creature.vitals.capacity = packet.value;
        break;
    }
  }

  handleWorldTime(time: number): void {
    window.gameClient.world.clock.setPhase(time);
  }

  handleSetTarget(id: number): void {
    if (id === 0) {
      window.gameClient.player!.setTarget(null);
      return;
    }

    let creature = window.gameClient.world.getCreature(id);
    if (!creature) return;

    window.gameClient.player!.setTarget(creature);
  }

  handleCombatLock(bool: boolean): void {
    const condition = {
      toggle: bool,
      guid: window.gameClient.player!.id,
      cid: ConditionManager.COMBAT_LOCK,
    };
    this.handleCondition(condition);
  }

  handleCondition(packet: { guid: number; toggle: boolean; cid: number }): void {
    let creature = window.gameClient.world.getCreature(packet.guid);
    if (!creature) return;

    if (packet.toggle) {
      creature.addCondition(packet.cid);
    } else {
      creature.removeCondition(packet.cid);
    }
  }

  handleTradeOffer(packet: any): void {
    window.gameClient.interface.modalManager.open("offer-modal", packet);
  }

  handlePlayerStatistics(packet: {
    capacity: number;
    attack: number;
    armor: number;
    speed: number;
  }): void {
    if (!window.gameClient.player) return;

    window.gameClient.player.vitals.state.capacity = packet.capacity;
    window.gameClient.player.vitals.state.attack = packet.attack;
    window.gameClient.player.vitals.state.armor = packet.armor;
    window.gameClient.player.vitals.speed = packet.speed;
  }

  handleOpenChannel(packet: any): void {
    window.gameClient.interface.channelManager.handleOpenChannel(packet);
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
    window.gameClient.renderer.addDistanceAnimation(packet);
  }

  handleSendMagicEffect(packet: any): void {
    window.gameClient.renderer.addPositionAnimation(packet);
  }

  handleTransformTile(packet: any): void {
    window.gameClient.world.handleTransformTile(packet);
  }

  handleAcceptLogin(packet: any): void {
    window.gameClient.handleAcceptLogin(packet);
  }

  handleRemoveFriend(name: string): void {
    window.gameClient.player!.friendlist.remove(name);
  }

  handleAddFriend(name: string): void {
    window.gameClient.player!.friendlist.add({name: name, online: true});
  }

  handleCancelMessage(packet: any): void {
    window.gameClient.interface.notificationManager.setCancelMessage(packet);
  }

  handleServerData(packet: any): void {
    window.gameClient.setServerData(packet);
  }

  handleEmote(packet: { id: number; message: string; color: number }): void {
    const creature = window.gameClient.world.getCreature(packet.id);
    if (!creature) return;
  
    window.gameClient.interface.screenElementManager.createFloatingTextElement(
      `<i>${packet.message}</i>`,
      creature.getPosition(),
      packet.color,
      packet.id // Pass creature ID for stagger tracking
    );
  }

  handleIncreaseHealth(packet: { id: number; amount: number }): void {
    let sourceCreature = window.gameClient.world.getCreature(packet.id);
    if (!sourceCreature) return;

    let health = Math.min(packet.amount, sourceCreature.maxHealth - sourceCreature.state.health);
    if (health === 0) return;

    sourceCreature.increaseHealth(health);

    window.gameClient.interface.screenElementManager.createFloatingTextElement(
      health.toString(),
      sourceCreature.getPosition(),
      Interface.COLORS.LIGHTGREEN
    );

    if (window.gameClient.player === sourceCreature) {
      window.gameClient.interface.channelManager.addConsoleMessage(
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
    window.gameClient.interface.notificationManager.setZoneMessage(packet.name, packet.title);
    //window.gameClient.renderer.weatherCanvas.setWeather(packet.weather);
    window.gameClient.renderer.setAmbientColor(packet.ambient.r, packet.ambient.g, packet.ambient.b, packet.ambient.a);
    window.gameClient.interface.soundManager.setAmbientTrace(packet.music);
  }

  handleLatency(): void {
    window.gameClient.networkManager.state.latency = performance.now() - window.gameClient.networkManager.latency;
  }

  handleChunk(chunk: Chunk): void {
    if (window.gameClient.world.chunks.some((c) => c.id === chunk.id)) return;

    window.gameClient.world.chunks.push(chunk);
    window.gameClient.world.chunks.sort((a, b) => a.id - b.id);
    window.gameClient.world.referenceTileNeighbours();
  }

  handleRemoveItem(packet: { position: any; index: number; count: number }): void {
    let tile = window.gameClient.world.getTileFromWorldPosition(packet.position);
    if (!tile) return;

    tile.removeItem(packet.index, packet.count);
  }

  handleAdvanceLevel(): void {
    //TODO: 
    //window.gameClient.player!.advanceLevel();
  }

  handleServerError(message: string): void {
    window.gameClient.interface.modalManager.open("floater-connecting", { message });
  }

  handleServerMessage(string: string): void {
    window.gameClient.interface.notificationManager.setServerMessage(string, Interface.COLORS.RED);
  }

  
  getTileUppie(position: Position): Tile | null {
    let tile = window.gameClient.world.getTileFromWorldPosition(position);

    if (tile && !tile.isOccupied()) {
      return tile;
    }

    if (tile?.id === 0) {
      return window.gameClient.world.getTileFromWorldPosition(position.down());
    }

    if (window.gameClient.player!.getTile().hasMaximumElevation()) {
      return window.gameClient.world.getTileFromWorldPosition(position.up());
    }

    return tile;
  }

  clientSideMoveCheck(position: Position): boolean {
    let tile = window.gameClient.world.getTileFromWorldPosition(position);

    if (tile && tile.monsters.size > 0) {
      return true;
    }

    if (tile?.id === 0) {
      if (window.gameClient.player!.vitals.position.isDiagonal(position)) {
        return true;
      }

      let belowTile = window.gameClient.world.getTileFromWorldPosition(position.down());

      if (belowTile && belowTile.hasMaximumElevation() && !belowTile.isOccupied()) {
        return false;
      }
    }

    if (window.gameClient.player!.getTile().hasMaximumElevation()) {
      if (window.gameClient.player!.vitals.position.isDiagonal(position)) {
        return true;
      }

      let upTile = window.gameClient.world.getTileFromWorldPosition(position.up());
      let aboveTile = window.gameClient.world.getTileFromWorldPosition(window.gameClient.player!.vitals.position.up());

      if ((!aboveTile || aboveTile.id === 0) && upTile && !upTile.isOccupied()) {
        return false;
      }
    }

    return !!tile?.isOccupied();
  }

  handlePlayerMove(position: Position): boolean {
    if (this.clientSideMoveCheck(position)) {
      window.gameClient.interface.setCancelMessage("You cannot walk here.");
      return false;
    }

    let tile = this.getTileUppie(position);
    let duration = window.gameClient.player!.getStepDuration(tile);
    window.gameClient.world.handleCreatureMove(window.gameClient.player!.id, position, duration);
    return true;
  }

  handleDamageEvent(packet: { source: number; target: number; damage: number; color: number }): void {
    let sourceCreature = window.gameClient.world.getCreature(packet.source);
    let targetCreature = window.gameClient.world.getCreature(packet.target);

    if (packet.source === 0 && targetCreature) {
      this.__handleDamageEnvironment(targetCreature, packet.damage, packet.color);
      return;
    }

    if (!sourceCreature || !targetCreature) {
      return;
    }

    targetCreature.addAnimation(1);

    if (targetCreature === window.gameClient.player && sourceCreature !== window.gameClient.player) {
      sourceCreature.addBoxAnimation(Interface.COLORS.BLACK);
    }

    targetCreature.increaseHealth(-packet.damage);

    if (window.gameClient.player === targetCreature) {
      window.gameClient.interface.channelManager.addConsoleMessage(
        `You lose ${packet.damage} health to a ${sourceCreature.name}.`,
        Interface.COLORS.WHITE
      );
    } else if (window.gameClient.player === sourceCreature) {
      window.gameClient.interface.channelManager.addConsoleMessage(
        `You deal ${packet.damage} damage to a ${targetCreature.name}.`,
        Interface.COLORS.WHITE
      );
    }

    window.gameClient.interface.screenElementManager.createFloatingTextElement(
      packet.damage.toString(),
      targetCreature.getPosition(),
      packet.color
    );
  }

  handleChangeOutfit(packet: { id: number; outfit: any }): void {
    let creature = window.gameClient.world.getCreature(packet.id);
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
    let thing = new Item(packet.cid, packet.count);

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

    window.gameClient.interface.notificationManager.setServerMessage(message, Interface.COLORS.LIGHTGREEN);
    window.gameClient.interface.channelManager.addConsoleMessage(message, Interface.COLORS.LIGHTGREEN);
  }

  handleItemInformation(packet: any): void {
    let message = this.getItemDescription(packet);
    let thing = new Thing(packet.cid);

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

    if (window.gameClient.renderer.debugger.isActive()) {
      message += ` (SID: ${packet.sid}, CID: ${packet.cid})`;
    }

    if (packet.x && packet.y) {
      message += ` (X: ${packet.x}, Y: ${packet.y}, Z: ${packet.z})`;
    }

    window.gameClient.interface.notificationManager.setServerMessage(message, Interface.COLORS.LIGHTGREEN);
    window.gameClient.interface.channelManager.addConsoleMessage(message, Interface.COLORS.LIGHTGREEN);
  }

  handleEntityRemove(id: number): void {
    let creature = window.gameClient.world.getCreature(id);
    if (!creature || window.gameClient.isSelf(creature)) return;

    let tile = window.gameClient.world.getTileFromWorldPosition(creature.getPosition());
    if (!tile) return;

    tile.monsters.delete(creature);
    if (window.gameClient.player!.__target === creature) {
      window.gameClient.player!.setTarget(null);
    }

    creature.remove();
    delete window.gameClient.world.activeCreatures[id];
    (window.gameClient.interface.windowManager.getWindow("battle-window") as BattleWindow).removeCreature(id);
  }

  handleContainerItemRemove(packet: { containerIndex: number; slotIndex: number; count: number }): void {
    let container = window.gameClient.player!.getContainer(packet.containerIndex);
    if (!container) return;
    container.removeItem(packet.slotIndex, packet.count);
  }

  handleContainerAddItem(packet: { containerId: number; itemId: number; count: number; slot: number }): void {
    let container = window.gameClient.player!.getContainer(packet.containerId);
    if (!container) return;
    container.addItem(new Item(packet.itemId, packet.count), packet.slot);
  }

  handleContainerOpen(packet: any): void {
    let container = new Container(packet);
    container.createDOM(packet.equipped ? `${packet.title}[E]` : packet.title, packet.items);
    window.gameClient.interface.windowManager.register(container.window);
    window.gameClient.player!.openContainer(container);
  }

  handleContainerClose(id: number): void {
    let container = window.gameClient.player!.getContainer(id);
    if (!container) return;
    window.gameClient.player!.removeContainer(container);
  }

  handlePlayerDisconnect(name: string): void {
    window.gameClient.player!.friendlist.setOnlineStatus(name, false);
  }

  handlePlayerConnect(name: string): void {
    window.gameClient.player!.friendlist.setOnlineStatus(name, true);
  }

  handleCreatureServerMove(packet: { id: number; position: Position; speed: number }): void {
    let entity = window.gameClient.world.getCreature(packet.id);
    if (!entity) return;

    window.gameClient.world.__handleCreatureMove(packet.id, packet.position, packet.speed);

    if (window.gameClient.isSelf(entity)) {
      window.gameClient.player!.confirmClientWalk();
      window.gameClient.world.checkEntityReferences();
      window.gameClient.world.checkChunks();
    }
  }

  handleReadText(packet: any): void {
    window.gameClient.interface.modalManager.open("readable-modal", packet);
  }

  handleChannelMessage(packet: { id: number; message: string; name: string; color: number }): void {
    let channel = window.gameClient.interface.channelManager.getChannelById(packet.id);
    if (!channel) return;
    channel.addMessage(packet.message, 0, packet.name, packet.color);
  }

  handleDefaultMessage(packet: { id: number }): void {
    let entity = window.gameClient.world.getCreature(packet.id);
    if (!entity || !window.gameClient.player!.canSeeSmall(entity)) return;
    entity.say(packet);
  }

  handleEntityTeleport(packet: { id: number; position: Position }): void {
    let entity = window.gameClient.world.getCreature(packet.id);
    if (!entity) return;

    entity.setPosition(packet.position);
    if (window.gameClient.isSelf(entity)) {
      window.gameClient.world.handleSelfTeleport();
    }
  }

  handleEntityReference(packet: any): void {
    if (window.gameClient.player && packet.id === window.gameClient.player.id) {
      return window.gameClient.world.addCreature(window.gameClient.player);
    }
  
    console.log("handleEntityReference: ", packet);
  
    const creatureData = {
      id: packet.id,
      type: CONST.TYPES[packet.type as keyof typeof CONST.TYPES] ?? 0,
      outfit: packet.outfit,
      conditions: packet.conditions,
      vitals: {
        name: packet.name,
        position: packet.position,
        direction: packet.direction,
        health: packet.health,
        maxHealth: packet.maxHealth,
        mana: 0,               // 🟡 placeholder (not sent from server)
        maxMana: 1,            // avoid NaN
        energy: 0,             // 🟡 placeholder
        maxEnergy: 1,
        capacity: 0,
        maxCapacity: 1,
        speed: packet.speed,
        attackSlowness: 0,
      }
    };
  
    window.gameClient.world.createCreature(packet.id, new Creature(creatureData));
  }

  handleCreatureTurn(packet: { id: number; direction: number }): void {
    let creature = window.gameClient.world.getCreature(packet.id);
    if (!creature) return;
    creature.setTurnBuffer(packet.direction);
  }

  handleReceivePrivateMessage(packet: { message: string; name: string }): void {
    let channel = window.gameClient.interface.channelManager.getChannel(packet.name);
    if (!channel) {
      channel = window.gameClient.interface.channelManager.getChannel("Default");
    }
    channel!.addPrivateMessage(packet.message, packet.name);
  }

  handleGainExperience(packet: { id: number; experience: number }): void {
    let creature = window.gameClient.world.getCreature(packet.id);
    if (!creature) {
      return console.error("Received experience gain for unknown creature.");
    }

    window.gameClient.interface.screenElementManager.createFloatingTextElement(
      packet.experience.toString(),
      creature.getPosition(),
      Interface.COLORS.WHITE
    );

    if (window.gameClient.player !== creature) return;

    window.gameClient.interface.channelManager.addConsoleMessage(
      `You gain ${packet.experience} experience.`,
      Interface.COLORS.WHITE
    );

    creature.addExperience(packet.experience);
  }

  handleItemAdd(packet: { id: number; count: number; position: Position; slot: number }): void {
    let thing = new Thing(packet.id);

    if (thing.hasFlag("DatFlagWritableOnce") || thing.hasFlag("DatFlagWritable")) {
      return window.gameClient.world.addItem(packet.position, new Book(packet.id), packet.slot);
    }

    if (thing.isFluidContainer() || thing.isSplash()) {
      return window.gameClient.world.addItem(packet.position, new FluidThing(packet.id, packet.count), packet.slot);
    }

    window.gameClient.world.addItem(packet.position, new Item(packet.id, packet.count), packet.slot);
  }

  private __handleDamageEnvironment(targetCreature: Creature, damage: number, color: number): void {
    window.gameClient.interface.screenElementManager.createFloatingTextElement(
      damage.toString(),
      targetCreature.getPosition(),
      color
    );

    window.gameClient.interface.channelManager.addConsoleMessage(
      `You lose ${damage} health.`,
      Interface.COLORS.WHITE
    );

    targetCreature.increaseHealth(-damage);
  }

}

export default PacketHandler;







