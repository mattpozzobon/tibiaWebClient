import FriendWindow from "../../window-friend";

export interface Friend {
  name: string;
  online: boolean;
}

export default class Friendlist {
  private __friends: Map<string, boolean>;
  private __sortFunction: (a: Friend, b: Friend) => number;
  private __showOffline: boolean;
 

  constructor(friends: Friend[]) {
    
    this.__friends = new Map<string, boolean>();
    this.__sortFunction = this.__nameSort;
    this.__showOffline = true;

    this.__addFriends(friends);
  }

  private __addFriends(friends: Friend[]): void {
    friends.forEach(this.__add, this);
    this.updateDOM();
  }

  public has(friend: string): boolean {
    return this.__friends.has(friend);
  }

  private __add(friend: Friend): void {
    this.__friends.set(friend.name, friend.online);
  }

  public add(friend: Friend): void {
    if (this.has(friend.name)) {
      console.error(`Friend ${friend.name} is already in the friend list.`);
      return;
    }
    this.__add(friend);
    this.updateDOM();
  }

  public setOnlineStatus(name: string, online: boolean): void {
    if (!this.has(name)) {
      return;
    }
    this.__friends.set(name, online);
    this.updateDOM();
  }

  public sortBy(which: string): void {
    switch (which) {
      case "normal":
        this.__sortFunction = this.__nameSort;
        break;
      case "reversed":
        this.__sortFunction = this.__reversedNameSort;
        break;
    }
    this.updateDOM();
  }

  public remove(name: string): void {
    if (!this.has(name)) {
      console.error(`Friend ${name} is not in your friend list.`);
      return;
    }
    this.__friends.delete(name);
    this.updateDOM();
  }

  public updateDOM(): void {
    const friendArray: Friend[] = Array.from(this.__friends, this.__deconstructMap.bind(this))
      .filter(this.__showOfflineFilter.bind(this))
      .sort(this.__sortFunction);
    (window.gameClient.interface.windowManager.getWindow("friend-window") as FriendWindow).generateContent(friendArray);
  }

  public toggleShowOffline(): void {
    this.__showOffline = !this.__showOffline;
    this.updateDOM();
  }

  private __deconstructMap([name, online]: [string, boolean]): Friend {
    return { name, online };
  }

  private __showOfflineFilter(friend: Friend): boolean {
    return friend.online || this.__showOffline;
  }

  private __reversedNameSort(a: Friend, b: Friend): number {
    // Sort by online status (descending) then alphabetically (ascending)
    return (Number(b.online) - Number(a.online)) ||
           a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  }

  private __nameSort(a: Friend, b: Friend): number {
    // Sort by online status (descending) then reverse alphabetically
    return (Number(b.online) - Number(a.online)) ||
           -a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  }
}
