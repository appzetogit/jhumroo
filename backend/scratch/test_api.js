import axios from 'axios';

const runTest = async () => {
  try {
    console.log('Sending request to http://localhost:5007/api/reels/feed...');
    const res = await axios.get('http://localhost:5007/api/reels/feed');
    console.log('API call response status:', res.status);
    console.log('Success:', res.data?.success);
    console.log('Number of reels returned:', res.data?.reels?.length);

    if (res.data?.reels && res.data.reels.length > 0) {
      console.log('\nSample Reel #1:');
      const sample = res.data.reels[0];
      console.log('ID:', sample._id);
      console.log('Caption:', sample.caption);
      console.log('Video URL:', sample.video?.url);
      console.log('Thumbnail URL:', sample.video?.thumbnail);
      console.log('Music Config:', sample.music);
    }
    process.exit(0);
  } catch (error) {
    console.error('API call failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
};

runTest();
