import array
import io
import math
import unittest
import wave
from delivery_metrics import measure_delivery


def tone():
    samples = array.array('h', (int(math.sin(i / 16000 * 2 * math.pi * 140) * 6000) for i in range(16000 * 3)))
    output = io.BytesIO()
    with wave.open(output, 'wb') as audio:
        audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(16000); audio.writeframes(samples.tobytes())
    return output.getvalue()


class DeliveryTests(unittest.TestCase):
    def test_ordinary_like_and_flat_pitch_do_not_lose_points(self):
        result = measure_delivery(tone(), 'I like walking around campus and taking photos after class.')
        self.assertEqual(result['fillers'], 0)
        self.assertEqual(result['deduction'], 0)
        self.assertLess(result['pitchSpanSemitones'], 2.5)
        self.assertTrue(any('does not tell us how you feel' in note for note in result['notes']))

    def test_repeated_detected_fillers_have_a_small_capped_deduction(self):
        result = measure_delivery(tone(), 'Um uh um uh erm, like, I got lost.')
        self.assertEqual(result['fillers'], 6)
        self.assertEqual(result['deduction'], 3)


if __name__ == '__main__':
    unittest.main()
