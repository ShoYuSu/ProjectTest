import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-add-staff',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './add-staff.component.html',
  styleUrl: './add-staff.component.css'
})
export class AddStaffComponent {
  showSuccessModal = signal(false);

  constructor(private router: Router) {}

  onSubmit() {
    this.showSuccessModal.set(true);
  }

  closeModal() {
    this.showSuccessModal.set(false);
    // เปลี่ยนจาก /admin/staff เป็น /staff ให้ตรงกับโครงสร้างใหม่
    this.router.navigate(['/staff']);
  }

  modules = [
    { id: 1, name: 'Dashboard', subName: 'แดชบอร์ด', isDashboard: true, viewAccess: true, view: 'all', add: 'none', edit: 'none' },
    { id: 2, name: 'Staff Info', subName: 'ข้อมูลบุคลากร', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 3, name: 'Research Info', subName: 'ข้อมูลวิจัย', isDashboard: false, viewAccess: true, view: 'own', add: 'own', edit: 'none' },
    { id: 4, name: 'Plans / Projects', subName: 'แผนงาน / โครงการ', isDashboard: false, viewAccess: true, view: 'dept', add: 'none', edit: 'none' },
    { id: 5, name: 'Training', subName: 'ข้อมูลอบรม', isDashboard: false, viewAccess: true, view: 'dept', add: 'own', edit: 'own' }
  ];
}