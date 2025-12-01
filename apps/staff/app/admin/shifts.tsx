import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Avatar, Modal, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import {
  shiftService,
  attendanceService,
  staffService,
  type Shift,
  type Attendance,
  type StaffWithStores,
} from '@beauty-pos/api';

interface WeekDay {
  date: Date;
  dayOfWeek: string;
  isToday: boolean;
}

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

export default function ShiftsScreen() {
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [staffList, setStaffList] = useState<StaffWithStores[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState<'shift' | 'attendance'>('shift');

  // Modal states
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffWithStores | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState('10:00');
  const [selectedEndTime, setSelectedEndTime] = useState('19:00');
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Calculate week days
  useEffect(() => {
    const days: WeekDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push({
        date,
        dayOfWeek: DAYS_OF_WEEK[date.getDay()],
        isToday: date.getTime() === today.getTime(),
      });
    }
    setWeekDays(days);
  }, [currentWeekStart]);

  // Load data
  const loadData = useCallback(async () => {
    if (!company?.id || !store?.id) return;

    try {
      setIsLoading(true);

      // Get week end date
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const [staffData, shiftsData, attendanceData] = await Promise.all([
        staffService.getByStore(store.id),
        shiftService.getByDateRange(
          store.id,
          currentWeekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0]
        ),
        attendanceService.getTodayByStore(store.id),
      ]);

      setStaffList(staffData);
      setShifts(shiftsData);
      setTodayAttendance(attendanceData);
    } catch (error) {
      console.error('Failed to load shift data:', error);
      showToast('データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, store?.id, currentWeekStart, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  // Get shift for a staff and date
  const getShift = (staffId: string, date: Date): Shift | null => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.find(s => s.staff_id === staffId && s.date === dateStr) || null;
  };

  // Open shift modal
  const openShiftModal = (staff: StaffWithStores, date: Date) => {
    const existingShift = getShift(staff.id, date);
    setSelectedStaff(staff);
    setSelectedDate(date);

    if (existingShift) {
      setEditingShift(existingShift);
      setSelectedStartTime(existingShift.start_time.substring(0, 5));
      setSelectedEndTime(existingShift.end_time.substring(0, 5));
    } else {
      setEditingShift(null);
      setSelectedStartTime('10:00');
      setSelectedEndTime('19:00');
    }

    setShowShiftModal(true);
  };

  // Save shift
  const saveShift = async () => {
    if (!company?.id || !store?.id || !selectedStaff || !selectedDate) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      if (editingShift) {
        await shiftService.update(editingShift.id, {
          start_time: selectedStartTime + ':00',
          end_time: selectedEndTime + ':00',
        });
        showToast('シフトを更新しました', 'success');
      } else {
        await shiftService.create({
          company_id: company.id,
          store_id: store.id,
          staff_id: selectedStaff.id,
          date: dateStr,
          start_time: selectedStartTime + ':00',
          end_time: selectedEndTime + ':00',
        });
        showToast('シフトを追加しました', 'success');
      }

      setShowShiftModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to save shift:', error);
      Alert.alert('エラー', 'シフトの保存に失敗しました');
    }
  };

  // Delete shift
  const deleteShift = async () => {
    if (!editingShift) return;

    Alert.alert(
      '確認',
      'このシフトを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await shiftService.delete(editingShift.id);
              showToast('シフトを削除しました', 'success');
              setShowShiftModal(false);
              loadData();
            } catch (error) {
              Alert.alert('エラー', 'シフトの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  // Copy previous week
  const copyPreviousWeek = async () => {
    if (!store?.id) return;

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    Alert.alert(
      '確認',
      '前週のシフトをコピーしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'コピー',
          onPress: async () => {
            try {
              await shiftService.copyWeek(
                store.id,
                previousWeekStart.toISOString().split('T')[0],
                currentWeekStart.toISOString().split('T')[0]
              );
              showToast('シフトをコピーしました', 'success');
              loadData();
            } catch (error) {
              Alert.alert('エラー', 'シフトのコピーに失敗しました');
            }
          },
        },
      ]
    );
  };

  // Get attendance for staff
  const getAttendance = (staffId: string): Attendance | null => {
    return todayAttendance.find(a => a.staff_id === staffId) || null;
  };

  // Handle clock in
  const handleClockIn = async (staff: StaffWithStores) => {
    if (!company?.id || !store?.id) return;

    try {
      await attendanceService.clockIn({
        company_id: company.id,
        store_id: store.id,
        staff_id: staff.id,
        date: new Date().toISOString().split('T')[0],
      });
      showToast(`${staff.last_name}さんが出勤しました`, 'success');
      loadData();
    } catch (error) {
      Alert.alert('エラー', '出勤記録に失敗しました');
    }
  };

  // Handle clock out
  const handleClockOut = async (attendance: Attendance) => {
    try {
      await attendanceService.clockOut(attendance.id);
      showToast('退勤を記録しました', 'success');
      loadData();
    } catch (error) {
      Alert.alert('エラー', '退勤記録に失敗しました');
    }
  };

  // Handle break
  const handleBreak = async (attendance: Attendance) => {
    try {
      if (attendance.status === 'on_break') {
        await attendanceService.endBreak(attendance.id);
        showToast('休憩終了を記録しました', 'success');
      } else {
        await attendanceService.startBreak(attendance.id);
        showToast('休憩開始を記録しました', 'success');
      }
      loadData();
    } catch (error) {
      Alert.alert('エラー', '休憩記録に失敗しました');
    }
  };

  // Format time
  const formatTime = (time: string | null): string => {
    if (!time) return '--:--';
    return time.substring(11, 16);
  };

  // Format week header
  const formatWeekHeader = (): string => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startMonth = currentWeekStart.getMonth() + 1;
    const startDay = currentWeekStart.getDate();
    const endMonth = weekEnd.getMonth() + 1;
    const endDay = weekEnd.getDate();

    if (startMonth === endMonth) {
      return `${currentWeekStart.getFullYear()}年${startMonth}月${startDay}日〜${endDay}日`;
    }
    return `${startMonth}/${startDay}〜${endMonth}/${endDay}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>シフト・勤怠管理</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shift' && styles.tabActive]}
          onPress={() => setActiveTab('shift')}
        >
          <Text style={[styles.tabText, activeTab === 'shift' && styles.tabTextActive]}>
            シフト表
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'attendance' && styles.tabActive]}
          onPress={() => setActiveTab('attendance')}
        >
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>
            本日の勤怠
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'shift' ? (
        <>
          {/* Week Navigation */}
          <View style={styles.weekNavigation}>
            <TouchableOpacity style={styles.weekNavButton} onPress={goToPreviousWeek}>
              <Text style={styles.weekNavButtonText}>◀ 前週</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToCurrentWeek}>
              <Text style={styles.weekTitle}>{formatWeekHeader()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.weekNavButton} onPress={goToNextWeek}>
              <Text style={styles.weekNavButtonText}>次週 ▶</Text>
            </TouchableOpacity>
          </View>

          {/* Copy Week Button */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.copyButton} onPress={copyPreviousWeek}>
              <Text style={styles.copyButtonText}>前週からコピー</Text>
            </TouchableOpacity>
          </View>

          {/* Shift Table */}
          <ScrollView style={styles.content} horizontal>
            <View>
              {/* Day Headers */}
              <View style={styles.tableHeader}>
                <View style={styles.staffColumn}>
                  <Text style={styles.staffColumnHeader}>スタッフ</Text>
                </View>
                {weekDays.map((day, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dayColumn,
                      day.isToday && styles.todayColumn,
                      day.date.getDay() === 0 && styles.sundayColumn,
                      day.date.getDay() === 6 && styles.saturdayColumn,
                    ]}
                  >
                    <Text style={[styles.dayOfWeek, day.date.getDay() === 0 && styles.sundayText, day.date.getDay() === 6 && styles.saturdayText]}>
                      {day.dayOfWeek}
                    </Text>
                    <Text style={[styles.dayDate, day.isToday && styles.todayText]}>
                      {day.date.getDate()}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Staff Rows */}
              <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
                {staffList.map((staff) => (
                  <View key={staff.id} style={styles.staffRow}>
                    <View style={styles.staffColumn}>
                      <Avatar
                        name={`${staff.last_name} ${staff.first_name}`}
                        source={staff.avatar_url}
                        size="sm"
                      />
                      <Text style={styles.staffName} numberOfLines={1}>
                        {staff.last_name}
                      </Text>
                    </View>
                    {weekDays.map((day, index) => {
                      const shift = getShift(staff.id, day.date);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.shiftCell,
                            day.isToday && styles.todayCell,
                          ]}
                          onPress={() => openShiftModal(staff, day.date)}
                        >
                          {shift ? (
                            <View style={styles.shiftContent}>
                              <Text style={styles.shiftTime}>
                                {shift.start_time.substring(0, 5)}
                              </Text>
                              <Text style={styles.shiftTimeSeparator}>-</Text>
                              <Text style={styles.shiftTime}>
                                {shift.end_time.substring(0, 5)}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.noShift}>-</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </>
      ) : (
        /* Attendance Tab */
        <ScrollView style={styles.attendanceContent} showsVerticalScrollIndicator={false}>
          <View style={styles.todayHeader}>
            <Text style={styles.todayDate}>
              {new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </Text>
          </View>

          {staffList.map((staff) => {
            const attendance = getAttendance(staff.id);
            const todayShift = getShift(staff.id, new Date());

            return (
              <Card key={staff.id} variant="outlined" size="md" style={styles.attendanceCard}>
                <View style={styles.attendanceRow}>
                  <View style={styles.attendanceStaff}>
                    <Avatar
                      name={`${staff.last_name} ${staff.first_name}`}
                      source={staff.avatar_url}
                      size="md"
                    />
                    <View style={styles.attendanceStaffInfo}>
                      <Text style={styles.attendanceStaffName}>
                        {staff.last_name} {staff.first_name}
                      </Text>
                      {todayShift && (
                        <Text style={styles.scheduledShift}>
                          予定: {todayShift.start_time.substring(0, 5)} - {todayShift.end_time.substring(0, 5)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.attendanceStatus}>
                    {!attendance ? (
                      <TouchableOpacity
                        style={styles.clockInButton}
                        onPress={() => handleClockIn(staff)}
                      >
                        <Text style={styles.clockInButtonText}>出勤</Text>
                      </TouchableOpacity>
                    ) : attendance.status === 'clocked_out' ? (
                      <View style={styles.clockedOut}>
                        <Text style={styles.clockedOutText}>退勤済</Text>
                        <Text style={styles.timeRecord}>
                          {formatTime(attendance.clock_in)} - {formatTime(attendance.clock_out)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.clockedIn}>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusBadgeText}>
                            {attendance.status === 'on_break' ? '休憩中' : '勤務中'}
                          </Text>
                        </View>
                        <Text style={styles.clockInTime}>
                          出勤: {formatTime(attendance.clock_in)}
                        </Text>
                        <View style={styles.attendanceActions}>
                          <TouchableOpacity
                            style={[
                              styles.breakButton,
                              attendance.status === 'on_break' && styles.breakButtonActive,
                            ]}
                            onPress={() => handleBreak(attendance)}
                          >
                            <Text style={styles.breakButtonText}>
                              {attendance.status === 'on_break' ? '休憩終了' : '休憩開始'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.clockOutButton}
                            onPress={() => handleClockOut(attendance)}
                            disabled={attendance.status === 'on_break'}
                          >
                            <Text style={styles.clockOutButtonText}>退勤</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            );
          })}

          {staffList.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>スタッフが登録されていません</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Shift Modal */}
      <Modal
        visible={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        title={editingShift ? 'シフト編集' : 'シフト追加'}
        size="md"
      >
        {selectedStaff && selectedDate && (
          <View style={styles.modalContent}>
            <Text style={styles.modalStaffName}>
              {selectedStaff.last_name} {selectedStaff.first_name}
            </Text>
            <Text style={styles.modalDate}>
              {selectedDate.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </Text>

            <View style={styles.timeSelector}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>開始時間</Text>
                <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                  {TIME_SLOTS.map((time) => (
                    <TouchableOpacity
                      key={`start-${time}`}
                      style={[
                        styles.timeOption,
                        selectedStartTime === time && styles.timeOptionSelected,
                      ]}
                      onPress={() => setSelectedStartTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          selectedStartTime === time && styles.timeOptionTextSelected,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.timeSeparator}>〜</Text>

              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>終了時間</Text>
                <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                  {TIME_SLOTS.map((time) => (
                    <TouchableOpacity
                      key={`end-${time}`}
                      style={[
                        styles.timeOption,
                        selectedEndTime === time && styles.timeOptionSelected,
                      ]}
                      onPress={() => setSelectedEndTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          selectedEndTime === time && styles.timeOptionTextSelected,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActions}>
              {editingShift && (
                <Button
                  variant="outline"
                  colorScheme="error"
                  onPress={deleteShift}
                  style={styles.deleteButton}
                >
                  削除
                </Button>
              )}
              <Button onPress={saveShift} style={styles.saveButton}>
                {editingShift ? '更新' : '追加'}
              </Button>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginTop: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing[2],
  },
  backButtonText: {
    ...textStyles.body,
    color: colors.primary[500],
  },
  headerTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  headerRight: {
    width: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    ...textStyles.label,
    color: colors.neutral[500],
  },
  tabTextActive: {
    color: colors.primary[500],
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  weekNavButton: {
    padding: spacing[2],
  },
  weekNavButtonText: {
    ...textStyles.label,
    color: colors.primary[500],
  },
  weekTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing[3],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  copyButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
  },
  copyButtonText: {
    ...textStyles.labelSm,
    color: colors.primary[600],
  },
  content: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  staffColumn: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    borderRightWidth: 1,
    borderRightColor: colors.neutral[200],
  },
  staffColumnHeader: {
    ...textStyles.labelSm,
    color: colors.neutral[500],
  },
  dayColumn: {
    width: 80,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRightWidth: 1,
    borderRightColor: colors.neutral[200],
  },
  todayColumn: {
    backgroundColor: colors.primary[50],
  },
  sundayColumn: {
    backgroundColor: colors.error[50],
  },
  saturdayColumn: {
    backgroundColor: colors.info[50],
  },
  dayOfWeek: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  sundayText: {
    color: colors.error[500],
  },
  saturdayText: {
    color: colors.info[500],
  },
  dayDate: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  todayText: {
    color: colors.primary[600],
    fontWeight: 'bold',
  },
  tableBody: {
    flex: 1,
    backgroundColor: colors.white,
  },
  staffRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  staffName: {
    ...textStyles.caption,
    color: colors.neutral[900],
    marginLeft: spacing[1],
    flex: 1,
  },
  shiftCell: {
    width: 80,
    paddingVertical: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.neutral[100],
    minHeight: 50,
  },
  todayCell: {
    backgroundColor: colors.primary[25],
  },
  shiftContent: {
    alignItems: 'center',
  },
  shiftTime: {
    ...textStyles.caption,
    color: colors.neutral[700],
    fontSize: 11,
  },
  shiftTimeSeparator: {
    ...textStyles.caption,
    color: colors.neutral[400],
    fontSize: 10,
  },
  noShift: {
    ...textStyles.caption,
    color: colors.neutral[300],
  },
  // Attendance styles
  attendanceContent: {
    flex: 1,
    padding: spacing[4],
  },
  todayHeader: {
    marginBottom: spacing[4],
  },
  todayDate: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  attendanceCard: {
    marginBottom: spacing[3],
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendanceStaff: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attendanceStaffInfo: {
    marginLeft: spacing[3],
  },
  attendanceStaffName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  scheduledShift: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  attendanceStatus: {
    alignItems: 'flex-end',
  },
  clockInButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  clockInButtonText: {
    ...textStyles.label,
    color: colors.white,
  },
  clockedOut: {
    alignItems: 'flex-end',
  },
  clockedOutText: {
    ...textStyles.labelSm,
    color: colors.neutral[500],
  },
  timeRecord: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  clockedIn: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    backgroundColor: colors.success[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.full,
    marginBottom: spacing[1],
  },
  statusBadgeText: {
    ...textStyles.caption,
    color: colors.success[700],
  },
  clockInTime: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[2],
  },
  attendanceActions: {
    flexDirection: 'row',
  },
  breakButton: {
    backgroundColor: colors.warning[100],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.md,
    marginRight: spacing[2],
  },
  breakButtonActive: {
    backgroundColor: colors.warning[500],
  },
  breakButtonText: {
    ...textStyles.caption,
    color: colors.warning[700],
  },
  clockOutButton: {
    backgroundColor: colors.neutral[200],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.md,
  },
  clockOutButtonText: {
    ...textStyles.caption,
    color: colors.neutral[700],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
  },
  emptyStateText: {
    ...textStyles.body,
    color: colors.neutral[400],
  },
  // Modal styles
  modalContent: {
    padding: spacing[2],
  },
  modalStaffName: {
    ...textStyles.h5,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  modalDate: {
    ...textStyles.body,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    ...textStyles.labelSm,
    color: colors.neutral[600],
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  timePickerScroll: {
    maxHeight: 200,
  },
  timeOption: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    alignItems: 'center',
  },
  timeOptionSelected: {
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.md,
  },
  timeOptionText: {
    ...textStyles.body,
    color: colors.neutral[700],
  },
  timeOptionTextSelected: {
    color: colors.primary[700],
    fontWeight: 'bold',
  },
  timeSeparator: {
    ...textStyles.h5,
    color: colors.neutral[400],
    marginHorizontal: spacing[2],
    paddingTop: spacing[8],
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    marginRight: spacing[2],
  },
  saveButton: {
    minWidth: 100,
  },
});
