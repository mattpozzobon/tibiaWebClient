export default class Skills {
  private __skills: { [key: string]: any };
 

  constructor(skills: { [key: string]: any }) {
    
    this.__skills = skills;
    
    // Modal system now handled by React components
    
    // Optional: Could dispatch a custom event for React components to listen to
    // window.dispatchEvent(new CustomEvent('skillsUpdate', { detail: skills }));
  }
}
