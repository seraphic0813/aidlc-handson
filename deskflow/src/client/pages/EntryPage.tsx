import { Button } from '../components/atoms/Button.js';
export function EntryPage({
  onRegister,
  onList,
}: {
  onRegister: () => void;
  onList: () => void;
}) {
  return (
    <>
      <section className="welcome">
        <p className="eyebrow">A CLEAR PATH TO RESOLUTION</p>
        <h2>
          相談から解決まで、
          <br />
          ひとつの流れに。
        </h2>
        <p>
          問い合わせを記録し、対応を引き継ぎ、
          <br />
          過去の回答を次の解決に役立てます。
        </p>
      </section>
      <div className="entry-options">
        <section className="entry-option">
          <span className="step-number">01 / REQUEST</span>
          <h2>問い合わせをする社員</h2>
          <p>困っていることや確認したいことを、IT窓口に登録します。</p>
          <Button onClick={onRegister}>問い合わせを登録する →</Button>
        </section>
        <section className="entry-option">
          <span className="step-number">02 / SUPPORT</span>
          <h2>対応する窓口担当者</h2>
          <p>状況を確認して回答を残します。過去の問い合わせも探せます。</p>
          <Button className="secondary" onClick={onList}>
            問い合わせ一覧を開く →
          </Button>
        </section>
      </div>
    </>
  );
}
