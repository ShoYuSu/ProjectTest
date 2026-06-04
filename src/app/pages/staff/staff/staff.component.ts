import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.css'
})
export class StaffComponent implements OnInit {
  isAdmin = false;

  mockStaffList = [
    { id: 1, name: 'ผศ.ดร. สมชาย ใจดี', position: 'อาจารย์ประจำ', department: 'วิทยาการคอมพิวเตอร์', researchCount: 15, image: 'https://i.pravatar.cc/150?img=11' },
    { id: 2, name: 'รศ.ดร. สมหญิง รักเรียน', position: 'หัวหน้าภาควิชา', department: 'เทคโนโลยีสารสนเทศ', researchCount: 32, image: 'https://i.pravatar.cc/150?img=5' },
    { id: 3, name: 'อ. มานะ อุตสาหะ', position: 'อาจารย์ประจำ', department: 'วิศวกรรมซอฟต์แวร์', researchCount: 5, image: 'https://i.pravatar.cc/150?img=8' },
    { id: 4, name: 'ดร. สมศักดิ์ พัฒนา', position: 'อาจารย์พิเศษ', department: 'วิทยาการคอมพิวเตอร์', researchCount: 12, image: 'https://i.pravatar.cc/150?img=15' },
    { id: 5, name: 'คุณ สมพร ดูแลดี', position: 'เจ้าหน้าที่บริหาร', department: 'ส่วนกลาง', researchCount: 0, image: '' },
    { id: 6, name: 'อ. สุดา น่ารัก', position: 'อาจารย์ประจำ', department: 'เทคโนโลยีสารสนเทศ', researchCount: 8, image: 'https://i.pravatar.cc/150?img=9' },
    { id: 7, name: 'ผศ. สมเกียรติ ยิ่งใหญ่', position: 'รองคณบดี', department: 'วิศวกรรมซอฟต์แวร์', researchCount: 20, image: 'https://i.pravatar.cc/150?img=12' },
    { id: 8, name: 'คุณ วารี สีสวย', position: 'นักวิจัย', department: 'ศูนย์วิจัยฯ', researchCount: 45, image: 'https://i.pravatar.cc/150?img=32' },
  ];

  ngOnInit() {
    // ตรวจสอบสิทธิ์ว่าเป็น admin หรือไม่
    const role = localStorage.getItem('role');
    this.isAdmin = (role === 'admin');
  }

  // ฟังก์ชันลบบัญชี
  deleteStaff(id: number, name: string) {
    if (confirm(`คำเตือน: คุณต้องการลบบัญชีของ "${name}" ใช่หรือไม่?\n(การกระทำนี้ไม่สามารถกู้คืนได้)`)) {
      this.mockStaffList = this.mockStaffList.filter(staff => staff.id !== id);
      alert('ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว');
      // 💡 ในอนาคตสามารถใส่โค้ดเรียก API ลบข้อมูลลง Database ได้ที่นี่
    }
  }
}