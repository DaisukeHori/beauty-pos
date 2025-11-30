import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Badge, Avatar, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';

interface Proposal {
  id: string;
  styleName: string;
  description: string;
  reason: string;
  stylistName: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const mockProposals: Proposal[] = [
  {
    id: '1',
    styleName: 'ゆるふわミディアム',
    description: '柔らかいウェーブで女性らしさを引き出すスタイルです。お手入れも簡単で、毎日のスタイリングが楽になります。',
    reason: 'お客様の髪質と顔型に合わせて、より柔らかい印象になるスタイルをご提案いたします。前回のカラーとの相性も良く、より魅力的に見えると思います。',
    stylistName: '田中 美咲',
    createdAt: '2024-01-15',
    status: 'pending',
  },
];

export default function ProposalScreen() {
  const [proposals] = useState<Proposal[]>(mockProposals);
  const [feedback, setFeedback] = useState('');

  const handleAccept = (proposalId: string) => {
    // Handle accept logic
    router.back();
  };

  const handleReject = (proposalId: string) => {
    // Handle reject logic
    router.back();
  };

  if (proposals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>提案はありません</Text>
        <Text style={styles.emptyText}>
          スタイリストからの提案があるとここに表示されます
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          戻る
        </Button>
      </View>
    );
  }

  const proposal = proposals[0];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Proposal Card */}
      <View style={styles.section}>
        <Card variant="elevated" size="lg">
          {/* Style Image Placeholder */}
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>💇‍♀️</Text>
            <Text style={styles.placeholderText}>提案スタイル</Text>
          </View>

          {/* Style Info */}
          <View style={styles.styleInfo}>
            <Text style={styles.styleName}>{proposal.styleName}</Text>
            <Text style={styles.styleDescription}>{proposal.description}</Text>
          </View>
        </Card>
      </View>

      {/* Stylist's Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>スタイリストからのメッセージ</Text>
        <Card variant="filled" size="md">
          <View style={styles.stylistHeader}>
            <Avatar name={proposal.stylistName} size="md" />
            <View style={styles.stylistInfo}>
              <Text style={styles.stylistName}>{proposal.stylistName}</Text>
              <Text style={styles.proposalDate}>{proposal.createdAt}</Text>
            </View>
          </View>
          <Text style={styles.reasonText}>{proposal.reason}</Text>
        </Card>
      </View>

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
          >
            他のスタイルを見たい
          </Button>
          <Button
            size="lg"
            onPress={() => handleAccept(proposal.id)}
            style={styles.actionButton}
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
  section: {
    padding: spacing[4],
    paddingBottom: 0,
  },
  sectionTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[3],
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
    marginBottom: spacing[6],
  },
});
