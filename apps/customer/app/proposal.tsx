import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, Avatar, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';
import { proposalService, StyleProposalWithDetails } from '@beauty-pos/api';
import { formatDateJP } from '@beauty-pos/core';

// Default customer ID for demo (should come from session in real app)
const DEFAULT_CUSTOMER_ID = 'demo-customer';

export default function ProposalScreen() {
  const [proposals, setProposals] = useState<StyleProposalWithDetails[]>([]);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProposals = useCallback(async () => {
    try {
      const data = await proposalService.getPending(DEFAULT_CUSTOMER_ID);
      setProposals(data);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleAccept = async (proposalId: string) => {
    Alert.alert(
      'スタイル決定',
      'このスタイルでよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '決定',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await proposalService.accept(proposalId, feedback || undefined);
              Alert.alert(
                'ありがとうございます',
                'スタイリストにお伝えしました。',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Error accepting proposal:', error);
              Alert.alert('エラー', '処理に失敗しました。');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (proposalId: string) => {
    Alert.alert(
      '別のスタイル',
      '他のスタイルを見たいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'はい',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await proposalService.reject(proposalId, feedback || undefined);
              Alert.alert(
                '承知しました',
                'スタイリストに別のスタイルをご提案いただくようお伝えします。',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Error rejecting proposal:', error);
              Alert.alert('エラー', '処理に失敗しました。');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (proposals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>提案はありません</Text>
        <Text style={styles.emptyText}>
          スタイリストからの提案があるとここに表示されます
        </Text>
        <Button variant="outline" onPress={() => router.back()} style={{ marginTop: spacing[4] }}>
          戻る
        </Button>
      </View>
    );
  }

  const proposal = proposals[0];
  const stylistName = `${proposal.staff.last_name} ${proposal.staff.first_name}`;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Proposal Card */}
      <View style={styles.section}>
        <Card variant="elevated" size="lg">
          {/* Style Image */}
          {proposal.image_url || proposal.hair_style?.image_url ? (
            <Image
              source={{ uri: proposal.image_url || proposal.hair_style?.image_url || '' }}
              style={styles.styleImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderIcon}>💇‍♀️</Text>
              <Text style={styles.placeholderText}>提案スタイル</Text>
            </View>
          )}

          {/* Style Info */}
          <View style={styles.styleInfo}>
            <Text style={styles.styleName}>{proposal.style_name}</Text>
            <Text style={styles.styleDescription}>
              {proposal.description || proposal.hair_style?.description || 'スタイリストからの提案です'}
            </Text>
          </View>
        </Card>
      </View>

      {/* Stylist's Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>スタイリストからのメッセージ</Text>
        <Card variant="filled" size="md">
          <View style={styles.stylistHeader}>
            <Avatar
              name={stylistName}
              size="md"
              imageUrl={proposal.staff.avatar_url || undefined}
            />
            <View style={styles.stylistInfo}>
              <Text style={styles.stylistName}>{stylistName}</Text>
              <Text style={styles.proposalDate}>
                {formatDateJP(new Date(proposal.created_at))}
              </Text>
            </View>
          </View>
          <Text style={styles.reasonText}>
            {proposal.reason || 'お客様に似合うスタイルをご提案させていただきました。ぜひご検討ください。'}
          </Text>
        </Card>
      </View>

      {/* Other pending proposals indicator */}
      {proposals.length > 1 && (
        <View style={styles.moreProposalsContainer}>
          <Badge colorScheme="primary" variant="subtle" size="md">
            他に{proposals.length - 1}件の提案があります
          </Badge>
        </View>
      )}

      {/* Customer Feedback */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ご意見・ご質問（任意）</Text>
        <View style={styles.feedbackContainer}>
          <TextInput
            style={styles.feedbackInput}
            placeholder="気になる点やご質問があればお書きください..."
            placeholderTextColor={colors.neutral[400]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={feedback}
            onChangeText={setFeedback}
            editable={!isSubmitting}
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.section}>
        <Text style={styles.actionHint}>
          このスタイルでよろしいですか？
        </Text>
        <View style={styles.actionButtons}>
          <Button
            variant="outline"
            size="lg"
            onPress={() => handleReject(proposal.id)}
            style={styles.actionButton}
            isDisabled={isSubmitting}
          >
            他のスタイルを見たい
          </Button>
          <Button
            size="lg"
            onPress={() => handleAccept(proposal.id)}
            style={styles.actionButton}
            isLoading={isSubmitting}
          >
            このスタイルで決定
          </Button>
        </View>
      </View>

      {/* Info Note */}
      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          ※ 決定後もスタイリストと相談して調整できます
        </Text>
      </View>

      <View style={styles.bottomPadding} />
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
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[3],
  },
  styleImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  imagePlaceholder: {
    backgroundColor: colors.neutral[100],
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: spacing[2],
  },
  placeholderText: {
    ...textStyles.body,
    color: colors.neutral[400],
  },
  styleInfo: {
    paddingTop: spacing[2],
  },
  styleName: {
    ...textStyles.h4,
    color: colors.neutral[900],
    marginBottom: spacing[2],
  },
  styleDescription: {
    ...textStyles.body,
    color: colors.neutral[600],
    lineHeight: 24,
  },
  stylistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  stylistInfo: {
    marginLeft: spacing[3],
  },
  stylistName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  proposalDate: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  reasonText: {
    ...textStyles.body,
    color: colors.neutral[700],
    lineHeight: 24,
  },
  moreProposalsContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    alignItems: 'center',
  },
  feedbackContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  feedbackInput: {
    ...textStyles.body,
    color: colors.neutral[900],
    padding: spacing[4],
    minHeight: 120,
  },
  actionHint: {
    ...textStyles.body,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  actionButtons: {
    flexDirection: 'column',
  },
  actionButton: {
    marginBottom: spacing[3],
  },
  noteContainer: {
    padding: spacing[4],
    alignItems: 'center',
  },
  noteText: {
    ...textStyles.caption,
    color: colors.neutral[400],
  },
  bottomPadding: {
    height: spacing[8],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
    backgroundColor: colors.neutral[50],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
    marginBottom: spacing[2],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.neutral[500],
    textAlign: 'center',
  },
});
