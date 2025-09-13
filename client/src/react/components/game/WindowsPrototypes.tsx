import React from 'react';
import './styles/WindowsPrototypes.scss';

const WindowsPrototypes: React.FC = () => {
  return (
    <>
      {/* The Container Prototype */}
      <div id="container-prototype" className="prototype window">
        <div className="header">
          <button className="symbol-button small" data-action="close" title="Close">✕</button>
          <button className="symbol-button small" data-action="minimize" title="Minimize">&#x2212;</button>
          <span className="title"></span>
        </div>
        <div className="body"></div>
        <div className="footer"></div>
      </div>

      {/* Context Menus */}
      <div className="contextmenu modal" id="screen-menu">
        <div className="menu-header">Menu</div>
        <button data-action="look">Look</button>
        <br />
        <button data-action="use">Use</button>
      </div>

      <div className="contextmenu modal" id="chat-header-menu">
        <div className="menu-header">Menu</div>
        <button data-action="close">Close</button>
      </div>

      <div className="contextmenu modal" id="hotbar-menu">
        <div className="menu-header">Menu</div>
        <button data-action="add">Add</button>
        <button data-action="remove">Remove</button>
      </div>

      <div className="contextmenu modal" id="chat-entry-menu">
        <div className="menu-header">Menu</div>
        <button data-action="whisper">Whisper</button>
      </div>

      <div className="contextmenu modal" id="chat-body-menu">
        <div className="menu-header">Menu</div>
        <button data-action="clear">Clear Chat</button>
      </div>
    </>
  );
};

export default WindowsPrototypes;
