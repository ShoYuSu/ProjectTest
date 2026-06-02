import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  isStaffExpanded = signal(false);
  isResearchExpanded = signal(false);
  isSidebarOpen = signal(false); 
  isMiniSidebar = signal(false); 

  toggleMiniSidebar() {
    this.isMiniSidebar.set(!this.isMiniSidebar());
    if (this.isMiniSidebar()) {
      this.isStaffExpanded.set(false);
      this.isResearchExpanded.set(false);
    }
  }

  toggleStaff() { 
    if (this.isMiniSidebar()) this.isMiniSidebar.set(false); 
    this.isStaffExpanded.set(!this.isStaffExpanded()); 
  }
  
  toggleResearch() { 
    if (this.isMiniSidebar()) this.isMiniSidebar.set(false); 
    this.isResearchExpanded.set(!this.isResearchExpanded()); 
  }
  
  toggleSidebar() { 
    this.isSidebarOpen.set(!this.isSidebarOpen()); 
  }

  closeSidebarOnMobile() {
    if (window.innerWidth < 1024) { 
      this.isSidebarOpen.set(false);
    }
  }
}