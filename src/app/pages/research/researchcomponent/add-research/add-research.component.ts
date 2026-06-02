import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-add-research',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './add-research.component.html',
  styleUrl: './add-research.component.css'
})
export class AddResearchComponent {
  
  // จำลองข้อมูลคณะผู้จัดทำ
  teamMembers = signal([
    { id: 1, name: 'ดร. ลอร์ดโวลเดอมอร์', role: 'หัวหน้าโครงการวิจัย' }
  ]);

  removeMember(id: number) {
    this.teamMembers.update(members => members.filter(m => m.id !== id));
  }

}