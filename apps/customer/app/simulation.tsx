import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card, Button, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';
import { hairStyleService, aiService, HairStyle } from '@beauty-pos/api';

// Default company/customer ID for demo (should come from session in real app)
const DEFAULT_COMPANY_ID = 'demo-company';
const DEFAULT_CUSTOMER_ID = 'demo-customer';

export default function SimulationScreen() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<HairStyle | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hairStyles, setHairStyles] = useState<HairStyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);

  useEffect(() => {
    loadHairStyles();
  }, []);

  const loadHairStyles = async () => {
    try {
      const styles = await hairStyleService.getAll(DEFAULT_COMPANY_ID, {
        featured_only: true,
        limit: 12,
      });
      setHairStyles(styles);
    } catch (error) {
      console.error('Error loading hair styles:', error);
    } finally {
      setIsLoadingStyles(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSourceImage(result.assets[0].uri);
      setGeneratedImage(null);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('カメラの許可が必要です', 'カメラを使用するには許可が必要です。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSourceImage(result.assets[0].uri);
      setGeneratedImage(null);
    }
  };

  const generateSimulation = async () => {
    if (!sourceImage || !selectedStyle) {
      Alert.alert('選択が必要です', '写真とヘアスタイルを選択してください。');
      return;
    }

    setIsProcessing(true);

    try {
      // Create a simulation record
      const simulation = await aiService.createSimulation({
        company_id: DEFAULT_COMPANY_ID,
        customer_id: DEFAULT_CUSTOMER_ID,
        customer_photo_url: sourceImage,
        style_image_url: selectedStyle.image_url || '',
        style_source: 'catalog',
        status: 'processing',
      });

      // In real implementation, this would call an AI Edge Function
      // For now, simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Update simulation status (in real app, AI would update this)
      if (simulation) {
        await aiService.updateSimulationStatus(simulation.id, 'completed');
      }

      // For demo, just show the source image
      // In real implementation, this would be the AI-generated result
      setGeneratedImage(sourceImage);

      Alert.alert(
        'シミュレーション完了',
        'AIによるヘアスタイルシミュレーションが完了しました。\n※実際のAI連携は Phase 4 で実装されます。'
      );
    } catch (error) {
      console.error('Error generating simulation:', error);
      Alert.alert('エラー', 'シミュレーションの生成に失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveResult = async () => {
    if (!generatedImage) return;

    try {
      Alert.alert('保存しました', 'シミュレーション結果を保存しました。');
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました。');
    }
  };

  const handleSelectStyle = () => {
    if (!generatedImage || !selectedStyle) return;

    Alert.alert(
      'スタイル決定',
      `「${selectedStyle.name}」でよろしいですか？\nスタイリストに伝えます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '決定',
          onPress: () => {
            Alert.alert('ありがとうございます', 'スタイリストにお伝えしました。');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Photo Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. あなたの写真を選択</Text>

        {sourceImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: sourceImage }} style={styles.selectedImage} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={() => setSourceImage(null)}
            >
              <Text style={styles.changeImageText}>変更</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Text style={styles.photoButtonIcon}>📷</Text>
              <Text style={styles.photoButtonText}>写真を撮る</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <Text style={styles.photoButtonIcon}>🖼️</Text>
              <Text style={styles.photoButtonText}>アルバムから選択</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Style Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. 試したいヘアスタイルを選択</Text>

        {isLoadingStyles ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
            <Text style={styles.loadingText}>スタイルを読み込み中...</Text>
          </View>
        ) : (
          <View style={styles.stylesGrid}>
            {hairStyles.map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.styleCard,
                  selectedStyle?.id === style.id && styles.styleCardSelected,
                ]}
                onPress={() => setSelectedStyle(style)}
              >
                {style.image_url ? (
                  <Image
                    source={{ uri: style.image_url }}
                    style={styles.styleImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.stylePlaceholder}>
                    <Text style={styles.stylePlaceholderIcon}>💇</Text>
                  </View>
                )}
                <Text style={styles.styleName} numberOfLines={1}>
                  {style.name}
                </Text>
                {selectedStyle?.id === style.id && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedIndicatorText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedStyle && (
          <View style={styles.selectedStyleInfo}>
            <Text style={styles.selectedStyleName}>{selectedStyle.name}</Text>
            <Text style={styles.selectedStyleDescription}>
              {selectedStyle.description || 'スタイルの詳細'}
            </Text>
          </View>
        )}
      </View>

      {/* Generate Button */}
      <View style={styles.section}>
        <Button
          onPress={generateSimulation}
          isLoading={isProcessing}
          isDisabled={!sourceImage || !selectedStyle}
          size="lg"
          fullWidth
        >
          {isProcessing ? 'シミュレーション中...' : 'シミュレーションを生成'}
        </Button>
        <Text style={styles.aiNote}>
          ※ AIがあなたの顔写真にヘアスタイルを合成します
        </Text>
      </View>

      {/* Result */}
      {generatedImage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>シミュレーション結果</Text>
          <Card variant="elevated" size="lg">
            <View style={styles.resultContainer}>
              <Image source={{ uri: generatedImage }} style={styles.resultImage} />
              <Text style={styles.resultNote}>
                ※ これはAIによるシミュレーションです。
                実際の仕上がりと異なる場合があります。
              </Text>
            </View>
            <View style={styles.resultActions}>
              <Button
                variant="outline"
                size="md"
                onPress={handleSaveResult}
                style={styles.resultButton}
              >
                保存する
              </Button>
              <Button
                size="md"
                onPress={handleSelectStyle}
                style={styles.resultButton}
              >
                このスタイルで決定
              </Button>
            </View>
          </Card>
        </View>
      )}

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
  },
  sectionTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
    marginBottom: spacing[3],
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  loadingText: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginTop: spacing[2],
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    marginHorizontal: spacing[1],
    ...shadows.sm,
  },
  photoButtonIcon: {
    fontSize: 40,
    marginBottom: spacing[2],
  },
  photoButtonText: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  selectedImage: {
    width: 200,
    height: 260,
    borderRadius: borderRadius.xl,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: spacing[2],
    right: '25%',
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  changeImageText: {
    ...textStyles.labelSm,
    color: colors.primary[500],
  },
  stylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[1],
  },
  styleCard: {
    width: '33.33%',
    padding: spacing[1],
    position: 'relative',
  },
  styleCardSelected: {},
  styleImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stylePlaceholder: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stylePlaceholderIcon: {
    fontSize: 32,
  },
  styleName: {
    ...textStyles.caption,
    color: colors.neutral[700],
    textAlign: 'center',
    marginTop: spacing[1],
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedStyleInfo: {
    backgroundColor: colors.primary[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginTop: spacing[3],
  },
  selectedStyleName: {
    ...textStyles.label,
    color: colors.primary[700],
    marginBottom: spacing[1],
  },
  selectedStyleDescription: {
    ...textStyles.bodySm,
    color: colors.primary[600],
  },
  aiNote: {
    ...textStyles.caption,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing[2],
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
  },
  resultNote: {
    ...textStyles.caption,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  resultActions: {
    flexDirection: 'row',
    marginTop: spacing[4],
  },
  resultButton: {
    flex: 1,
    marginHorizontal: spacing[1],
  },
  bottomPadding: {
    height: spacing[8],
  },
});
