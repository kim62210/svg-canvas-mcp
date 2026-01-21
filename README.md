# SVG Canvas MCP

Claude Code에서 포토샵 수준의 SVG 그래픽을 생성할 수 있는 MCP(Model Context Protocol) 서버입니다.

## 주요 기능

- **캔버스 관리**: 생성, 열기, 저장, 리사이즈
- **도형 그리기**: 사각형, 원, 타원, 선, 다각형, 별, 하트, 둥근 모서리 사각형
- **패스 빌더**: 베지어 곡선, 호(arc), 직선을 조합한 복잡한 경로 생성
- **텍스트/이미지**: 다양한 스타일의 텍스트, 이미지 삽입
- **레이어 시스템**: 레이어 생성, 삭제, 순서 변경, 가시성, 잠금, 블렌드 모드
- **객체 조작**: 이동, 회전, 스케일, 복제, 그룹화, Z-순서
- **스타일링**: 채우기, 선, 그라디언트(선형/원형), 패턴, 필터(블러, 그림자 등)
- **애니메이션**: CSS 키프레임, SMIL 애니메이션 지원
- **심볼**: 재사용 가능한 심볼 정의 및 인스턴스 배치
- **템플릿**: 캔버스를 템플릿으로 저장/불러오기
- **히스토리**: Undo/Redo 지원
- **내보내기**: SVG, PNG, Data URI
- **AI 기능**: 색상 팔레트 추천, 색상 분석, 객체 정렬 제안, 레이아웃 추천
- **블로그 운영 기능**:
  - OG 이미지 프리셋 (10개 플랫폼, 6개 테마)
  - 2D/3D 차트 생성 (bar, line, pie, donut, pyramid)
  - 2D/3D 다이어그램 (flowchart, mindmap, sequence, isometric)
  - QR 코드 생성 (순수 SVG 기반)
  - 워터마크 오버레이
- **이미지 트레이싱**: 비트맵 이미지를 벡터 패스로 변환 (potrace 기반)

## 설치

### 의존성

```bash
npm install
```

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@modelcontextprotocol/sdk` | ^1.0.0 | MCP 프로토콜 SDK |
| `@anthropic-ai/sdk` | ^0.39.0 | Anthropic API (AI 기능) |
| `svgson` | ^5.3.1 | SVG 파싱/직렬화 |
| `svg-path-commander` | ^2.0.8 | SVG 패스 조작 |
| `uuid` | ^10.0.0 | 고유 ID 생성 |
| `zod` | ^3.23.0 | 스키마 검증 |
| `potrace` | ^2.1.8 | 이미지 트레이싱 (비트맵→벡터) |

### 빌드

```bash
npm run build
```

## Claude Code 설정

### 1. `.mcp.json` 파일 생성

프로젝트 루트 또는 `~/.claude/` 디렉토리에 `.mcp.json` 파일을 생성합니다:

```json
{
  "mcpServers": {
    "svg-canvas": {
      "command": "node",
      "args": ["/path/to/svg-canvas-mcp/build/index.js"]
    }
  }
}
```

### 2. 활성화

`~/.claude/settings.local.json`에서 활성화:

```json
{
  "enabledMcpjsonServers": ["svg-canvas"]
}
```

## 사용 예시

### 기본 캔버스 생성

```
SVG 캔버스 MCP를 사용해서 1200x630 크기의 썸네일을 만들어줘
```

### 도형 그리기

```
빨간색 원과 파란색 사각형을 그려줘
```

### 그라디언트 적용

```
배경에 보라색에서 파란색으로 가는 그라디언트를 적용해줘
```

### 애니메이션 추가

```
로고에 회전 애니메이션을 추가해줘
```

## 도구 목록

### 캔버스
| 도구 | 설명 |
|------|------|
| `svg_create` | 새 캔버스 생성 |
| `svg_open` | SVG 파일 열기 |
| `svg_save` | 파일로 저장 |
| `svg_info` | 캔버스 정보 조회 |
| `svg_resize` | 크기 변경 |
| `svg_set_background` | 배경색 설정 |

### 도형 그리기
| 도구 | 설명 |
|------|------|
| `draw_rect` | 사각형 |
| `draw_circle` | 원 |
| `draw_ellipse` | 타원 |
| `draw_line` | 직선 |
| `draw_polyline` | 연결선 |
| `draw_polygon` | 다각형 |
| `draw_text` | 텍스트 |
| `draw_image` | 이미지 |
| `draw_path` | SVG 패스 |
| `draw_regular_polygon` | 정다각형 |
| `draw_star` | 별 |
| `draw_heart` | 하트 |
| `draw_rounded_rect_path` | 둥근 모서리 사각형 |

### 패스 빌더
| 도구 | 설명 |
|------|------|
| `path_create` | 패스 시작 |
| `path_lineto` | 직선 추가 |
| `path_curveto` | 베지어 곡선 |
| `path_arcto` | 호(arc) 추가 |
| `path_close` | 패스 닫기 |
| `path_finish` | 패스 완료 |
| `path_cancel` | 패스 취소 |

### 레이어
| 도구 | 설명 |
|------|------|
| `layer_create` | 레이어 생성 |
| `layer_delete` | 레이어 삭제 |
| `layer_rename` | 이름 변경 |
| `layer_reorder` | 순서 변경 |
| `layer_visibility` | 표시/숨김 |
| `layer_lock` | 잠금 |
| `layer_opacity` | 불투명도 |
| `layer_blend_mode` | 블렌드 모드 |
| `layer_list` | 목록 조회 |
| `layer_select` | 레이어 선택 |
| `layer_merge` | 레이어 병합 |
| `layer_duplicate` | 레이어 복제 |

### 객체 조작
| 도구 | 설명 |
|------|------|
| `object_select` | 객체 선택 |
| `object_list` | 객체 목록 |
| `object_move` | 이동 |
| `object_scale` | 크기 조절 |
| `object_rotate` | 회전 |
| `object_delete` | 삭제 |
| `object_duplicate` | 복제 |
| `object_group` | 그룹화 |
| `object_ungroup` | 그룹 해제 |
| `object_order` | Z-순서 변경 |

### 스타일
| 도구 | 설명 |
|------|------|
| `style_fill` | 채우기 |
| `style_stroke` | 선 스타일 |
| `style_opacity` | 불투명도 |
| `style_gradient` | 그라디언트 정의 |
| `style_pattern` | 패턴 정의 |
| `style_filter` | 필터 적용 |
| `style_remove_filter` | 필터 제거 |

### 애니메이션
| 도구 | 설명 |
|------|------|
| `anim_css_add` | CSS 애니메이션 |
| `anim_smil_add` | SMIL 애니메이션 |
| `anim_remove` | 애니메이션 제거 |
| `anim_list` | 애니메이션 목록 |

### 심볼 & 템플릿
| 도구 | 설명 |
|------|------|
| `symbol_define` | 심볼 정의 |
| `symbol_use` | 심볼 사용 |
| `template_save` | 템플릿 저장 |
| `template_load` | 템플릿 불러오기 |
| `template_list` | 템플릿 목록 |
| `template_delete` | 템플릿 삭제 |

### 히스토리
| 도구 | 설명 |
|------|------|
| `history_undo` | 실행 취소 |
| `history_redo` | 다시 실행 |
| `history_list` | 히스토리 목록 |
| `history_goto` | 특정 시점으로 이동 |
| `history_clear` | 히스토리 삭제 |

### 내보내기
| 도구 | 설명 |
|------|------|
| `export_svg` | SVG 파일로 저장 |
| `export_code` | SVG 코드 반환 |
| `export_png` | PNG 파일로 저장 |
| `export_data_uri` | Data URI 변환 |
| `preview_browser` | 브라우저 미리보기 |

### AI 기능
| 도구 | 설명 |
|------|------|
| `ai_suggest_colors` | 색상 팔레트 추천 |
| `ai_analyze_colors` | 색상 분석 |
| `ai_align_objects` | 객체 정렬 제안 |
| `ai_suggest_layout` | 레이아웃 추천 |

### OG 이미지 프리셋
| 도구 | 설명 |
|------|------|
| `preset_list` | 사용 가능한 플랫폼/테마 목록 |
| `preset_create_og` | 플랫폼별 OG 이미지 생성 |
| `preset_create_thumbnail` | 간편 썸네일 생성 |

**지원 플랫폼**: og, naver_blog, naver_search, twitter, youtube, instagram, instagram_story, tistory, pinterest, linkedin

**지원 테마**: modern, dark, gradient_blue, gradient_sunset, minimal, nature

### 차트
| 도구 | 설명 |
|------|------|
| `chart_bar` | 막대 차트 |
| `chart_line` | 선 차트 |
| `chart_pie` | 파이 차트 |
| `chart_donut` | 도넛 차트 |
| `chart_3d_bar` | 3D 막대 차트 |
| `chart_3d_pie` | 3D 파이 차트 |
| `chart_3d_pyramid` | 3D 피라미드 차트 |

### 다이어그램
| 도구 | 설명 |
|------|------|
| `diagram_flowchart` | 플로우차트 |
| `diagram_mindmap` | 마인드맵 |
| `diagram_sequence` | 시퀀스 다이어그램 |
| `diagram_isometric` | 아이소메트릭 블록 다이어그램 |
| `diagram_3d_architecture` | 3D 인프라 아키텍처 |

### QR 코드
| 도구 | 설명 |
|------|------|
| `qrcode_generate` | QR 코드 생성 |
| `qrcode_batch` | 다량 QR 코드 생성 |

### 워터마크
| 도구 | 설명 |
|------|------|
| `watermark_text` | 텍스트 워터마크 |
| `watermark_image` | 이미지 워터마크 |
| `watermark_copyright` | 저작권 표시 |
| `watermark_diagonal` | 대각선 반복 워터마크 |
| `watermark_remove` | 워터마크 제거 |

### 이미지 트레이싱
| 도구 | 설명 |
|------|------|
| `trace_image` | 이미지를 벡터 패스로 변환 (흑백) |
| `trace_color` | 컬러 이미지를 다색 벡터로 변환 |
| `trace_outline` | 외곽선만 추출 |
| `trace_silhouette` | 실루엣(단색 형태) 추출 |

## 프로젝트 구조

```
svg-canvas-mcp/
├── src/
│   ├── index.ts          # 엔트리포인트
│   ├── server.ts         # MCP 서버 설정
│   ├── core/             # 핵심 모듈
│   │   ├── document.ts   # SVG 문서 관리
│   │   ├── element.ts    # SVG 요소 조작
│   │   ├── history-manager.ts  # Undo/Redo
│   │   ├── layer-manager.ts    # 레이어 관리
│   │   └── template-manager.ts # 템플릿 관리
│   ├── tools/            # MCP 도구 정의
│   │   ├── canvas.ts     # 캔버스 도구
│   │   ├── drawing.ts    # 그리기 도구
│   │   ├── path.ts       # 패스 빌더
│   │   ├── layer.ts      # 레이어 도구
│   │   ├── object.ts     # 객체 조작
│   │   ├── style.ts      # 스타일링
│   │   ├── animation.ts  # 애니메이션
│   │   ├── symbol.ts     # 심볼
│   │   ├── history.ts    # 히스토리
│   │   ├── export.ts     # 내보내기
│   │   ├── ai.ts         # AI 기능
│   │   ├── preset.ts     # OG 이미지 프리셋
│   │   ├── chart.ts      # 2D/3D 차트
│   │   ├── diagram.ts    # 2D/3D 다이어그램
│   │   ├── qrcode.ts     # QR 코드
│   │   ├── watermark.ts  # 워터마크
│   │   └── trace.ts      # 이미지 트레이싱
│   ├── types/            # TypeScript 타입
│   └── utils/            # 유틸리티
│       ├── color-utils.ts
│       ├── path-utils.ts
│       ├── svg-parser.ts
│       ├── transform-utils.ts
│       └── validation.ts
├── build/                # 빌드 출력
├── package.json
└── tsconfig.json
```

## 개발

```bash
# 개발 모드 (빌드 + 실행)
npm run dev

# 빌드만
npm run build

# 감시 모드
npm run watch
```

## 라이선스

MIT License
