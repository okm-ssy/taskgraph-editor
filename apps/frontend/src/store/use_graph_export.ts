import { ref } from 'vue';

import { useCurrentTasks } from './task_store';

export const useGraphExport = () => {
  const taskStore = useCurrentTasks();
  const graphRef = ref<HTMLElement | null>(null);

  const setGraphRef = (ref: HTMLElement | null) => {
    graphRef.value = ref;
  };

  // SVGとして保存する関数
  const exportAsSvg = () => {
    if (!graphRef.value) return;

    try {
      const svgElement = graphRef.value.querySelector('svg');
      if (!svgElement) {
        alert('SVG要素が見つかりませんでした');
        return;
      }

      // SVG要素のクローンを作成（元のSVGを変更しないため）
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      // ノード情報をSVGに追加
      const nodesGroup = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'g',
      );

      taskStore.graphNodes.forEach((node) => {
        // ノード用の矩形を作成
        const rect = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'rect',
        );
        rect.setAttribute('x', node.x.toString());
        rect.setAttribute('y', node.y.toString());
        rect.setAttribute(
          'width',
          taskStore.GRAPH_SETTINGS.nodeWidth.toString(),
        );
        rect.setAttribute(
          'height',
          taskStore.GRAPH_SETTINGS.nodeHeight.toString(),
        );
        rect.setAttribute('rx', '4'); // 角丸
        rect.setAttribute('ry', '4');

        // 難易度に基づいて色を設定
        let fillColor = '#f0fdf4'; // デフォルト緑系
        let strokeColor = '#86efac';

        switch (Math.min(Math.max(Math.floor(node.difficulty), 1), 5)) {
          case 1: // 緑
            fillColor = '#f0fdf4';
            strokeColor = '#86efac';
            break;
          case 2: // 黄
            fillColor = '#fefce8';
            strokeColor = '#fde047';
            break;
          case 3: // オレンジ
            fillColor = '#fff7ed';
            strokeColor = '#fdba74';
            break;
          case 4: // 赤
            fillColor = '#fef2f2';
            strokeColor = '#fca5a5';
            break;
          case 5: // 紫
            fillColor = '#faf5ff';
            strokeColor = '#d8b4fe';
            break;
        }

        rect.setAttribute('fill', fillColor);
        rect.setAttribute('stroke', strokeColor);
        rect.setAttribute('stroke-width', '2');

        // タイトルテキスト
        const title = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text',
        );
        title.setAttribute('x', (node.x + 10).toString());
        title.setAttribute('y', (node.y + 20).toString());
        title.setAttribute('font-weight', 'bold');
        title.setAttribute('font-size', '12');
        title.textContent = node.name;

        // 説明テキスト
        const desc = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text',
        );
        desc.setAttribute('x', (node.x + 10).toString());
        desc.setAttribute('y', (node.y + 40).toString());
        desc.setAttribute('font-size', '10');
        desc.textContent =
          node.description.length > 25
            ? node.description.substring(0, 25) + '...'
            : node.description;

        // 難易度テキスト
        const diff = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text',
        );
        diff.setAttribute('x', (node.x + 10).toString());
        diff.setAttribute('y', (node.y + 60).toString());
        diff.setAttribute('font-size', '9');
        diff.textContent = `難易度: ${node.difficulty}`;

        // グループに追加
        nodesGroup.appendChild(rect);
        nodesGroup.appendChild(title);
        nodesGroup.appendChild(desc);
        nodesGroup.appendChild(diff);
      });

      clonedSvg.appendChild(nodesGroup);

      // サイズと表示範囲を設定
      clonedSvg.setAttribute('width', taskStore.canvasWidth.toString());
      clonedSvg.setAttribute('height', taskStore.canvasHeight.toString());
      clonedSvg.setAttribute(
        'viewBox',
        `0 0 ${taskStore.canvasWidth} ${taskStore.canvasHeight}`,
      );

      // SVGをシリアライズしてデータURLに変換
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);

      // ダウンロード
      const link = document.createElement('a');
      link.download = `taskgraph-${new Date().toISOString().slice(0, 10)}.svg`;
      link.href = url;
      link.click();

      // URLを解放
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('SVGエクスポートエラー:', error);
      alert('SVGのエクスポート中にエラーが発生しました');
    }
  };

  return {
    setGraphRef,
    exportAsSvg,
    // exportAsPng, // 将来的に追加可能
  };
};
