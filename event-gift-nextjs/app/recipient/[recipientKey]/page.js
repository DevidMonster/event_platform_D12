import RecipientDetailPage from '../../../components/pages/RecipientDetailPage';

export default function RecipientRoute({ params }) {
  return <RecipientDetailPage recipientKey={params?.recipientKey} />;
}
