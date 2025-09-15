export interface Friend {
  name: string;
  online: boolean;
}

export default class Friendlist {
  private __friends: Map<string, boolean>;
  private __friendRequests: string[];
  private __sortFunction: (a: Friend, b: Friend) => number;
  private __showOffline: boolean;
 

  constructor(friends: Friend[], friendRequests: string[] = []) {
    
    this.__friends = new Map<string, boolean>();
    this.__friendRequests = friendRequests;
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

  public getFriendRequests(): string[] {
    return [...this.__friendRequests];
  }

  public addFriendRequest(name: string): void {
    if (!this.__friendRequests.includes(name)) {
      this.__friendRequests.push(name);
      this.updateDOM();
    }
  }

  public removeFriendRequest(name: string): void {
    const index = this.__friendRequests.indexOf(name);
    if (index > -1) {
      this.__friendRequests.splice(index, 1);
      this.updateDOM();
    }
  }

  public updateFromServer(friends: Friend[], friendRequests: string[]): void {
    // Clear existing friends and requests
    this.__friends.clear();
    this.__friendRequests = [...friendRequests];
    
    // Add all friends from server
    friends.forEach(friend => {
      this.__friends.set(friend.name, friend.online);
    });
    
    // Trigger update
    this.updateDOM();
  }

  public updateDOM(): void {
    const friendArray: Friend[] = Array.from(this.__friends, this.__deconstructMap.bind(this))
      .filter(this.__showOfflineFilter.bind(this))
      .sort(this.__sortFunction);
    
    // Dispatch custom event for React components to listen to
    window.dispatchEvent(new CustomEvent('friendsUpdate', { 
      detail: { 
        friends: friendArray,
        allFriends: Array.from(this.__friends, this.__deconstructMap.bind(this)),
        friendRequests: [...this.__friendRequests]
      } 
    }));
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
    // Sort by online status (descending) then reverse alphabetically
    return (Number(b.online) - Number(a.online)) ||
           -a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  }

  private __nameSort(a: Friend, b: Friend): number {
    // Sort by online status (descending) then alphabetically (ascending)
    return (Number(b.online) - Number(a.online)) ||
           a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  }
}
