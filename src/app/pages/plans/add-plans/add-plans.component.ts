import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-add-plans',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './add-plans.component.html',
  styleUrl: './add-plans.component.css'
})
export class AddPlansComponent {
  
  // ================= กิจกรรมย่อย =================
  subActivities = signal([{ id: 1, value: '' }]);
  nextSubId = 2;

  addSubActivity() {
    this.subActivities.update(list => [...list, { id: this.nextSubId++, value: '' }]);
  }

  removeSubActivity(id: number) {
    this.subActivities.update(list => list.filter(item => item.id !== id));
  }

  updateSubActivity(id: number, newValue: string) {
    this.subActivities.update(list => 
      list.map(item => item.id === id ? { ...item, value: newValue } : item)
    );
  }

  // ================= ข้อมูล Dropdowns =================
  strategiesList = signal([
    '1. Future Research and Innovation',
    '2. Future Education',
    '3. Future Lecturer/Researcher',
    '4. Future System for Management',
    '5. Sustainable Future',
    '6. บริการวิชาการและบริการชุมชน',
    '7. การทำนุบำรุงศิลปะและวัฒนธรรมและสร้างจิตสำนึกฯ'
  ]);

  plansList = signal(['แผนงาน1', 'แผนงาน2', 'แผนงาน3', 'แผนงาน4', 'แผนงาน5']);
  
  statusList = ['อยู่ระหว่างดำเนินการ', 'ยังไม่ได้ดำเนินการ', 'เสร็จสิ้น'];

  // ================= State ควบคุมหลัก =================
  isStrategyOpen = signal(false);
  selectedStrategy = signal('เลือกแผนยุทธศาสตร์');
  isAddingStrategy = signal(false);
  editingStrategyIndex = signal<number | null>(null); // จำตำแหน่งที่กำลังแก้ไข

  isPlanOpen = signal(false);
  selectedPlan = signal('เลือกแผนงาน');
  isAddingPlan = signal(false);
  editingPlanIndex = signal<number | null>(null); // จำตำแหน่งที่กำลังแก้ไข

  isStatusOpen = signal(false);
  selectedStatus = signal('ระบุสถานะ');

  // ================= 🎯 ฟังก์ชันควบคุมยุทธศาสตร์ 🎯 =================
  toggleStrategy() {
    this.isStrategyOpen.set(!this.isStrategyOpen());
    this.isPlanOpen.set(false);
    this.isStatusOpen.set(false);
    this.isAddingStrategy.set(false);
    this.editingStrategyIndex.set(null);
  }

  selectStrategy(strategy: string) {
    this.selectedStrategy.set(strategy);
    this.isStrategyOpen.set(false);
  }

  addNewStrategy(value: string) {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      this.strategiesList.update(list => [...list, trimmedValue]);
      this.selectedStrategy.set(trimmedValue);
      this.isAddingStrategy.set(false);
    }
  }

  startEditStrategy(index: number, event: Event) {
    event.stopPropagation(); // ไม่ให้ Dropdown ปิด
    this.editingStrategyIndex.set(index);
    this.isAddingStrategy.set(false);
  }

  saveEditStrategy(index: number, newValue: string, event: Event) {
    event.stopPropagation();
    const trimmedValue = newValue.trim();
    if (trimmedValue) {
      this.strategiesList.update(list => {
        const newList = [...list];
        // ถ้าค่าที่ถูกแก้คือค่าที่เลือกอยู่ ให้เปลี่ยนค่าที่เลือกตามไปด้วย
        if (this.selectedStrategy() === newList[index]) {
          this.selectedStrategy.set(trimmedValue);
        }
        newList[index] = trimmedValue;
        return newList;
      });
    }
    this.editingStrategyIndex.set(null);
  }

  cancelEditStrategy(event: Event) {
    event.stopPropagation();
    this.editingStrategyIndex.set(null);
  }

  deleteStrategy(index: number, event: Event) {
    event.stopPropagation();
    const itemToDelete = this.strategiesList()[index];
    this.strategiesList.update(list => list.filter((_, i) => i !== index));
    // ถ้ารายการที่ลบ คือรายการที่ถูกเลือกอยู่ ให้รีเซ็ตค่ากลับ
    if (this.selectedStrategy() === itemToDelete) {
      this.selectedStrategy.set('เลือกแผนยุทธศาสตร์');
    }
    if (this.editingStrategyIndex() === index) {
      this.editingStrategyIndex.set(null);
    }
  }

  // ================= 🎯 ฟังก์ชันควบคุมแผนงาน 🎯 =================
  togglePlan() {
    this.isPlanOpen.set(!this.isPlanOpen());
    this.isStrategyOpen.set(false);
    this.isStatusOpen.set(false);
    this.isAddingPlan.set(false);
    this.editingPlanIndex.set(null);
  }

  selectPlan(plan: string) {
    this.selectedPlan.set(plan);
    this.isPlanOpen.set(false);
  }

  addNewPlan(value: string) {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      this.plansList.update(list => [...list, trimmedValue]);
      this.selectedPlan.set(trimmedValue);
      this.isAddingPlan.set(false);
    }
  }

  startEditPlan(index: number, event: Event) {
    event.stopPropagation();
    this.editingPlanIndex.set(index);
    this.isAddingPlan.set(false);
  }

  saveEditPlan(index: number, newValue: string, event: Event) {
    event.stopPropagation();
    const trimmedValue = newValue.trim();
    if (trimmedValue) {
      this.plansList.update(list => {
        const newList = [...list];
        if (this.selectedPlan() === newList[index]) {
          this.selectedPlan.set(trimmedValue);
        }
        newList[index] = trimmedValue;
        return newList;
      });
    }
    this.editingPlanIndex.set(null);
  }

  cancelEditPlan(event: Event) {
    event.stopPropagation();
    this.editingPlanIndex.set(null);
  }

  deletePlan(index: number, event: Event) {
    event.stopPropagation();
    const itemToDelete = this.plansList()[index];
    this.plansList.update(list => list.filter((_, i) => i !== index));
    if (this.selectedPlan() === itemToDelete) {
      this.selectedPlan.set('เลือกแผนงาน');
    }
    if (this.editingPlanIndex() === index) {
      this.editingPlanIndex.set(null);
    }
  }

  // ================= ฟังก์ชันควบคุมสถานะ =================
  toggleStatus() {
    this.isStatusOpen.set(!this.isStatusOpen());
    this.isStrategyOpen.set(false);
    this.isPlanOpen.set(false);
  }

  selectStatus(status: string) {
    this.selectedStatus.set(status);
    this.isStatusOpen.set(false);
  }
}