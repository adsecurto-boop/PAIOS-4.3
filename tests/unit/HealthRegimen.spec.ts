/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PAIOSStorage } from '../../src/storage';
import { Medication, RefillInventory, DoctorContact, Appointment } from '../../src/types';

describe('Unit Test: Health & Medication Regimen Engine', () => {
  beforeEach(() => {
    PAIOSStorage.clear();
  });

  it('saves and retrieves active medications', () => {
    const med: Medication = {
      id: 'med_test_1',
      genericName: 'Sertraline',
      brandName: 'Zoloft',
      dosageStrength: 50,
      dosageUnit: 'mg',
      form: 'tablet',
      route: 'oral',
      status: 'active',
      instructions: 'Take 1 tablet in morning',
      scheduleTimes: ['08:00'],
      foodRelation: 'with_meals',
      createdAtMillis: Date.now(),
    };

    PAIOSStorage.saveMedication(med);
    const retrieved = PAIOSStorage.getMedications();

    expect(retrieved.some((m) => m.id === 'med_test_1')).toBe(true);
  });

  it('logs dose events and updates refill stock count', () => {
    const refill: RefillInventory = {
      id: 'refill_test_1',
      medicationId: 'med_test_1',
      medicationName: 'Sertraline 50 mg',
      quantityRemaining: 10,
      unit: 'tablets',
      dailyBurnRate: 1,
      minimumThresholdDays: 5,
    };

    PAIOSStorage.saveRefillInventory(refill);
    const updated = PAIOSStorage.updateRefillQuantity('med_test_1', -1);

    expect(updated).not.toBeNull();
    expect(updated!.quantityRemaining).toBe(9);
  });

  it('deletes medication from storage', () => {
    const med: Medication = {
      id: 'med_del_1',
      genericName: 'Propranolol',
      brandName: 'Inderal',
      dosageStrength: 40,
      dosageUnit: 'mg',
      form: 'tablet',
      route: 'oral',
      status: 'active',
      instructions: 'Take as needed',
      scheduleTimes: ['08:00'],
      createdAtMillis: Date.now(),
    };

    PAIOSStorage.saveMedication(med);
    PAIOSStorage.deleteMedication('med_del_1');

    expect(PAIOSStorage.getMedications().some((m) => m.id === 'med_del_1')).toBe(false);
  });

  it('saves doctor contact information', () => {
    const doc: DoctorContact = {
      id: 'doc_test_1',
      name: 'Dr. Devendra Ratnani',
      specialty: 'Neuropsychiatry',
      clinicName: 'Ratnani Mind Care',
      phone: '+91 98260 12345',
    };

    PAIOSStorage.saveDoctor(doc);
    const doctors = PAIOSStorage.getDoctors();
    expect(doctors.some((d) => d.id === 'doc_test_1')).toBe(true);
  });

  it('books and updates scheduled medical appointments', () => {
    const apt = PAIOSStorage.bookAppointment({
      doctorId: 'doc_1',
      doctorName: 'Dr. Devendra Ratnani',
      scheduledTimeMillis: Date.now() + 86400000,
      scheduledDateString: '2026-08-30',
      scheduledTimeString: '10:00',
      reason: 'Medication Review',
      status: 'SCHEDULED',
    });

    expect(apt.id).toContain('apt_');

    PAIOSStorage.updateAppointmentStatus(apt.id, 'COMPLETED');
    const appointments = PAIOSStorage.getAppointments();
    const updated = appointments.find((a) => a.id === apt.id);
    expect(updated!.status).toBe('COMPLETED');
  });

  it('handles appointment cancellation status transition', () => {
    const apt = PAIOSStorage.bookAppointment({
      doctorId: 'doc_2',
      doctorName: 'Dr. Vance',
      scheduledTimeMillis: Date.now() + 86400000 * 2,
      scheduledDateString: '2026-08-31',
      scheduledTimeString: '11:00',
      reason: 'Checkup',
      status: 'SCHEDULED',
    });

    PAIOSStorage.updateAppointmentStatus(apt.id, 'CANCELLED');
    const updated = PAIOSStorage.getAppointments().find((a) => a.id === apt.id);
    expect(updated!.status).toBe('CANCELLED');
  });

  it('deletes doctor contact from storage', () => {
    const doc: DoctorContact = {
      id: 'doc_del',
      name: 'Dr Delete',
      specialty: 'General',
    };
    PAIOSStorage.saveDoctor(doc);
    PAIOSStorage.deleteDoctor('doc_del');
    expect(PAIOSStorage.getDoctors().some((d) => d.id === 'doc_del')).toBe(false);
  });

  it('logs vital signs telemetry into health history', () => {
    const vital = PAIOSStorage.logVitalSign({
      systolicBp: 120,
      diastolicBp: 80,
      restingHeartRate: 72,
      symptoms: 'Normal baseline check',
    });

    expect(vital.id).toContain('vital_');
    expect(PAIOSStorage.getVitalSigns().length).toBeGreaterThanOrEqual(1);
  });
});
