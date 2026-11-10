import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { parseMarkdown, type Block } from '@crabwatch/shared'
import { useTheme } from '../../hooks/useTheme'
import { FONT } from '../../utils/fonts'

/**
 * React Native port of the web LegalDocument layout
 * (web/src/components/legal/LegalDocument.tsx).
 *
 * Renders a markdown string as a professional card:
 * accent bar, title header, section headers with accent bars,
 * dot bullets, and a footer. Dark-mode aware via useTheme.
 */

function renderInline(text: string, keyPrefix: string, boldStyle: object, italicStyle: object): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(
        <Text key={`${keyPrefix}-b${i}`} style={boldStyle}>
          {token.slice(2, -2)}
        </Text>
      )
    } else {
      nodes.push(
        <Text key={`${keyPrefix}-i${i}`} style={italicStyle}>
          {token.slice(1, -1)}
        </Text>
      )
    }
    lastIndex = match.index + token.length
    i++
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  return nodes
}

export function LegalDocument({ markdown }: { markdown: string }) {
  const { colors, isDark } = useTheme()

  const { title, lastUpdated, contentBlocks } = useMemo(() => {
    const blocks = parseMarkdown(markdown)
    let t = ''
    let lu = ''
    const content: Block[] = []
    for (const block of blocks) {
      if (block.type === 'h1' && !t) {
        t = block.text
        continue
      }
      if (block.type === 'p' && !lu) {
        const m = block.text.match(/^\*\*Last updated:\*\*\s*(.+)$/)
        if (m) {
          lu = m[1]
          continue
        }
      }
      content.push(block)
    }
    return { title: t, lastUpdated: lu, contentBlocks: content }
  }, [markdown])

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.4 : 0.1,
          shadowRadius: 12,
          elevation: 6,
        },
        accentBar: {
          height: 6,
          backgroundColor: colors.primary,
        },
        header: {
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        title: {
          fontSize: FONT.xl + 4,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.2,
        },
        badge: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          marginTop: 10,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 4,
          backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : '#e0f2fe',
        },
        badgeText: {
          fontSize: 12,
          fontWeight: '500',
          color: isDark ? '#7dd3fc' : '#0369a1',
        },
        body: {
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 24,
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 20,
          marginBottom: 10,
        },
        sectionBar: {
          width: 4,
          height: 24,
          borderRadius: 2,
          backgroundColor: colors.primary,
          marginRight: 12,
        },
        sectionTitle: {
          flex: 1,
          fontSize: FONT.xl,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.2,
        },
        subHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 14,
          marginBottom: 8,
        },
        subBar: {
          width: 4,
          height: 16,
          borderRadius: 2,
          backgroundColor: colors.primary,
          marginRight: 10,
        },
        subTitle: {
          flex: 1,
          fontSize: FONT.lg,
          fontWeight: '600',
          color: colors.text,
        },
        h3: {
          marginTop: 10,
          marginBottom: 6,
          fontSize: FONT.md,
          fontWeight: '600',
          color: colors.text,
        },
        paragraph: {
          fontSize: FONT.base,
          lineHeight: FONT.base * 1.6,
          color: colors.textSecondary,
          marginBottom: 12,
        },
        listItem: {
          flexDirection: 'row',
          marginBottom: 8,
        },
        listItemNested: {
          flexDirection: 'row',
          marginBottom: 8,
          marginLeft: 16,
        },
        bullet: {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.primary,
          marginTop: 7,
          marginRight: 10,
        },
        listText: {
          flex: 1,
          fontSize: FONT.base,
          lineHeight: FONT.base * 1.6,
          color: colors.textSecondary,
        },
        footer: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: 24,
          paddingVertical: 16,
        },
        footerText: {
          fontSize: 12,
          color: isDark ? '#64748b' : '#94a3b8',
        },
      }),
    [colors, isDark]
  )

  const boldStyle = { fontWeight: '600', color: colors.text }
  const italicStyle = { fontStyle: 'italic' }

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />
      <View style={styles.header}>
        <Text style={styles.title}>{title || 'Legal Document'}</Text>
        {lastUpdated ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Last updated: {lastUpdated}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        {contentBlocks.map((block, idx) => {
          const key = `blk-${idx}`
          switch (block.type) {
            case 'hr':
              return null
            case 'h1':
              return (
                <View key={key} style={styles.sectionHeader}>
                  <View style={styles.sectionBar} />
                  <Text style={styles.sectionTitle}>{renderInline(block.text, key, boldStyle, italicStyle)}</Text>
                </View>
              )
            case 'h2':
              return (
                <View key={key} style={styles.subHeader}>
                  <View style={styles.subBar} />
                  <Text style={styles.subTitle}>{renderInline(block.text, key, boldStyle, italicStyle)}</Text>
                </View>
              )
            case 'h3':
              return (
                <Text key={key} style={styles.h3}>
                  {renderInline(block.text, key, boldStyle, italicStyle)}
                </Text>
              )
            case 'ul':
              return (
                <View key={key}>
                  {block.items.map((item, i) => (
                    <View key={`${key}-li-${i}`} style={item.depth === 1 ? styles.listItemNested : styles.listItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.listText}>{renderInline(item.text, `${key}-li-${i}`, boldStyle, italicStyle)}</Text>
                    </View>
                  ))}
                </View>
              )
            case 'p':
            default:
              return (
                <Text key={key} style={styles.paragraph}>
                  {renderInline(block.text, key, boldStyle, italicStyle)}
                </Text>
              )
          }
        })}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {`\u00A9 ${new Date().getFullYear()} CRABWATCH \u00B7 Universiti Malaysia Terengganu`}
        </Text>
      </View>
    </View>
  )
}
