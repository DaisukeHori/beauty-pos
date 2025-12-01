import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Card, Button, Avatar, Modal, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore } from '@beauty-pos/core';
import {
  customerService,
  staffService,
  menuService,
  reservationService,
  type Customer,
  type Staff,
  type Menu,
} from '@beauty-pos/api';

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function NewReservationScreen() {
  const params = useLocalSearchParams<{ date?: string; customerId?: string }>();
  const { company, store } = useAuthStore();
  const { showToast } = useUIStore();

  // Form state
  const [selectedDate, setSelectedDate] = useState(params.date || new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedMenus, setSelectedMenus] = useState<Menu[]>([]);
  const [notes, setNotes] = useState('');

  // Search/Selection state
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showStaffSelect, setShowStaffSelect] = useState(false);
  const [showMenuSelect, setShowMenuSelect] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Data state
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [menuList, setMenuList] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time slots
  const timeSlots: TimeSlot[] = [];
  for (let hour = 9; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      timeSlots.push({
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        available: true,
      });
    }
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!company?.id || !store?.id) return;

      try {
        const [staffData, menuData] = await Promise.all([
          staffService.getAll(company.id),
          menuService.getAll(company.id, store.id),
        ]);
        setStaffList(staffData.filter(s => s.is_active));
        setMenuList(menuData.filter(m => m.is_active));

        // Load customer if ID provided
        if (params.customerId) {
          const customer = await customerService.getById(params.customerId);
          if (customer) {
            setSelectedCustomer(customer);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        showToast('データの読み込みに失敗しました', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [company?.id, store?.id, params.customerId, showToast]);

  // Customer search
  useEffect(() => {
    if (!company?.id || customerSearchQuery.length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await customerService.search(company.id, customerSearchQuery);
        setCustomerSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [customerSearchQuery, company?.id]);

  const calculateTotalDuration = () => {
    return selectedMenus.reduce((total, menu) => total + (menu.duration_minutes || 0), 0);
  };

  const calculateTotalPrice = () => {
    return selectedMenus.reduce((total, menu) => total + menu.price, 0);
  };

  const calculateEndTime = () => {
    if (!selectedTime) return null;
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + calculateTotalDuration();
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!company?.id || !store?.id) {
      showToast('店舗情報が取得できません', 'error');
      return;
    }

    if (!selectedTime) {
      showToast('時間を選択してください', 'warning');
      return;
    }

    if (selectedMenus.length === 0) {
      showToast('メニューを選択してください', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const startTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const endTime = new Date(startTime.getTime() + calculateTotalDuration() * 60000);

      await reservationService.create({
        company_id: company.id,
        store_id: store.id,
        customer_id: selectedCustomer?.id || null,
        staff_id: selectedStaff?.id || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        source: 'app',
        notes: notes || null,
      });

      showToast('予約を作成しました', 'success');
      router.back();
    } catch (error) {
      console.error('Failed to create reservation:', error);
      showToast('予約作成に失敗しました', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getMonth() + 1}月${date.getDate()}日(${weekDays[date.getDay()]})`;
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
    <ScrollView style={styles.container}>
      {/* Date Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>日付</Text>
        <Card variant="outlined" size="md">
          <TouchableOpacity style={styles.selector}>
            <Text style={styles.selectorValue}>{formatDate(selectedDate)}</Text>
            <Text style={styles.selectorArrow}>›</Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* Time Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>時間</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.timeGrid}>
            {timeSlots.map((slot) => (
              <TouchableOpacity
                key={slot.time}
                style={[
                  styles.timeSlot,
                  selectedTime === slot.time && styles.timeSlotSelected,
                  !slot.available && styles.timeSlotDisabled,
                ]}
                onPress={() => slot.available && setSelectedTime(slot.time)}
                disabled={!slot.available}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    selectedTime === slot.time && styles.timeSlotTextSelected,
                    !slot.available && styles.timeSlotTextDisabled,
                  ]}
                >
                  {slot.time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Customer Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>顧客（任意）</Text>
        <Card variant="outlined" size="md">
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowCustomerSearch(true)}
          >
            {selectedCustomer ? (
              <View style={styles.selectedItem}>
                <Avatar name={`${selectedCustomer.last_name}${selectedCustomer.first_name}`} size="sm" />
                <Text style={styles.selectedName}>
                  {selectedCustomer.last_name} {selectedCustomer.first_name}
                </Text>
              </View>
            ) : (
              <Text style={styles.selectorPlaceholder}>顧客を選択...</Text>
            )}
            <Text style={styles.selectorArrow}>›</Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* Staff Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>担当スタッフ（任意）</Text>
        <Card variant="outlined" size="md">
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowStaffSelect(true)}
          >
            {selectedStaff ? (
              <View style={styles.selectedItem}>
                <Avatar name={`${selectedStaff.last_name}${selectedStaff.first_name}`} size="sm" />
                <Text style={styles.selectedName}>
                  {selectedStaff.last_name} {selectedStaff.first_name}
                </Text>
              </View>
            ) : (
              <Text style={styles.selectorPlaceholder}>フリー（指名なし）</Text>
            )}
            <Text style={styles.selectorArrow}>›</Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* Menu Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>メニュー</Text>
        <Card variant="outlined" size="md">
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowMenuSelect(true)}
          >
            {selectedMenus.length > 0 ? (
              <View style={styles.selectedMenus}>
                {selectedMenus.map((menu) => (
                  <Text key={menu.id} style={styles.selectedMenuItem}>
                    {menu.name}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.selectorPlaceholder}>メニューを選択...</Text>
            )}
            <Text style={styles.selectorArrow}>›</Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>メモ</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="予約に関するメモ..."
          placeholderTextColor={colors.neutral[400]}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Summary */}
      {selectedTime && selectedMenus.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>予約内容</Text>
          <Card variant="filled" size="md">
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>日時</Text>
              <Text style={styles.summaryValue}>
                {formatDate(selectedDate)} {selectedTime} - {calculateEndTime()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>所要時間</Text>
              <Text style={styles.summaryValue}>{calculateTotalDuration()}分</Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.summaryLabel}>合計金額</Text>
              <Text style={styles.summaryValue}>¥{calculateTotalPrice().toLocaleString()}</Text>
            </View>
          </Card>
        </View>
      )}

      {/* Submit Button */}
      <View style={styles.section}>
        <Button
          fullWidth
          size="lg"
          onPress={handleSubmit}
          isLoading={isSubmitting}
          isDisabled={!selectedTime || selectedMenus.length === 0}
        >
          予約を作成
        </Button>
      </View>

      <View style={styles.bottomPadding} />

      {/* Customer Search Modal */}
      <Modal
        visible={showCustomerSearch}
        onClose={() => {
          setShowCustomerSearch(false);
          setCustomerSearchQuery('');
        }}
        title="顧客を選択"
        size="lg"
      >
        <TextInput
          style={styles.searchInput}
          placeholder="名前・電話番号で検索"
          value={customerSearchQuery}
          onChangeText={setCustomerSearchQuery}
          placeholderTextColor={colors.neutral[400]}
        />
        {isSearching ? (
          <ActivityIndicator style={styles.searchingIndicator} />
        ) : (
          <ScrollView style={styles.searchResults}>
            {customerSearchResults.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                style={styles.searchResultItem}
                onPress={() => {
                  setSelectedCustomer(customer);
                  setShowCustomerSearch(false);
                  setCustomerSearchQuery('');
                }}
              >
                <Avatar name={`${customer.last_name}${customer.first_name}`} size="sm" />
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>
                    {customer.last_name} {customer.first_name}
                  </Text>
                  <Text style={styles.searchResultMeta}>
                    {customer.phone || 'TEL未登録'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <Button
          variant="outline"
          fullWidth
          onPress={() => {
            setSelectedCustomer(null);
            setShowCustomerSearch(false);
          }}
          style={styles.modalButton}
        >
          顧客なしで予約
        </Button>
      </Modal>

      {/* Staff Select Modal */}
      <Modal
        visible={showStaffSelect}
        onClose={() => setShowStaffSelect(false)}
        title="担当スタッフを選択"
        size="lg"
      >
        <ScrollView style={styles.searchResults}>
          <TouchableOpacity
            style={styles.searchResultItem}
            onPress={() => {
              setSelectedStaff(null);
              setShowStaffSelect(false);
            }}
          >
            <View style={styles.freeStaffIcon}>
              <Text>✓</Text>
            </View>
            <Text style={styles.searchResultName}>フリー（指名なし）</Text>
          </TouchableOpacity>
          {staffList.map((staff) => (
            <TouchableOpacity
              key={staff.id}
              style={styles.searchResultItem}
              onPress={() => {
                setSelectedStaff(staff);
                setShowStaffSelect(false);
              }}
            >
              <Avatar name={`${staff.last_name}${staff.first_name}`} size="sm" />
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultName}>
                  {staff.last_name} {staff.first_name}
                </Text>
                <Text style={styles.searchResultMeta}>
                  {staff.role === 'stylist' ? 'スタイリスト' :
                   staff.role === 'assistant' ? 'アシスタント' : staff.role}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>

      {/* Menu Select Modal */}
      <Modal
        visible={showMenuSelect}
        onClose={() => setShowMenuSelect(false)}
        title="メニューを選択"
        size="lg"
      >
        <ScrollView style={styles.searchResults}>
          {menuList.map((menu) => {
            const isSelected = selectedMenus.some((m) => m.id === menu.id);
            return (
              <TouchableOpacity
                key={menu.id}
                style={[styles.menuItem, isSelected && styles.menuItemSelected]}
                onPress={() => {
                  if (isSelected) {
                    setSelectedMenus(selectedMenus.filter((m) => m.id !== menu.id));
                  } else {
                    setSelectedMenus([...selectedMenus, menu]);
                  }
                }}
              >
                <View style={styles.menuCheckbox}>
                  {isSelected && <Text style={styles.menuCheckmark}>✓</Text>}
                </View>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuName}>{menu.name}</Text>
                  <Text style={styles.menuMeta}>
                    {menu.duration_minutes}分 / ¥{menu.price.toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Button
          fullWidth
          onPress={() => setShowMenuSelect(false)}
          style={styles.modalButton}
        >
          選択完了 ({selectedMenus.length}件)
        </Button>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginTop: spacing[3],
  },
  section: {
    padding: spacing[4],
    paddingBottom: 0,
  },
  sectionTitle: {
    ...textStyles.labelSm,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  selectorValue: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  selectorPlaceholder: {
    ...textStyles.body,
    color: colors.neutral[400],
  },
  selectorArrow: {
    fontSize: 24,
    color: colors.neutral[400],
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedName: {
    ...textStyles.body,
    color: colors.neutral[900],
    marginLeft: spacing[2],
  },
  selectedMenus: {
    flex: 1,
  },
  selectedMenuItem: {
    ...textStyles.bodySm,
    color: colors.neutral[700],
    marginBottom: spacing[0.5],
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: spacing[2],
  },
  timeSlot: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginRight: spacing[2],
    marginBottom: spacing[2],
  },
  timeSlotSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  timeSlotDisabled: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.neutral[200],
  },
  timeSlotText: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  timeSlotTextSelected: {
    color: colors.white,
  },
  timeSlotTextDisabled: {
    color: colors.neutral[400],
  },
  notesInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 100,
    ...textStyles.body,
    color: colors.neutral[900],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  summaryLabel: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
  },
  summaryValue: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  bottomPadding: {
    height: spacing[8],
  },
  searchInput: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    ...textStyles.body,
    color: colors.neutral[900],
    marginBottom: spacing[4],
  },
  searchingIndicator: {
    marginVertical: spacing[8],
  },
  searchResults: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  searchResultInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  searchResultName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  searchResultMeta: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  freeStaffIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  menuItemSelected: {
    backgroundColor: colors.primary[50],
    marginHorizontal: -spacing[4],
    paddingHorizontal: spacing[4],
  },
  menuCheckbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  menuCheckmark: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  menuInfo: {
    flex: 1,
  },
  menuName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  menuMeta: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  modalButton: {
    marginTop: spacing[4],
  },
});
